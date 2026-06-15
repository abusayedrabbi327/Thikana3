const pool = require('../config/db')
const { createNotification } = require('./notificationController')
const {
  manualReview,
  blockNidForVerification,
  sanitizeVerification,
  getSecureImagePath,
} = require('../services/identityVerificationService')
const {
  DEFAULT_ADMIN_SETTINGS,
  hydrateSettings,
  invalidateAdminSettingsCache,
} = require('../services/adminSettingsService')

let infraReadyPromise = null

function toInt(value, fallback) {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return parsed
}

function toSafePagination(page, limit, maxLimit = 100) {
  const parsedPage = Math.max(1, toInt(page, 1))
  const parsedLimit = Math.min(Math.max(1, toInt(limit, 20)), maxLimit)
  const offset = (parsedPage - 1) * parsedLimit
  return { parsedPage, parsedLimit, offset }
}

async function ensureAdminInfrastructure() {
  if (infraReadyPromise) return infraReadyPromise
  infraReadyPromise = (async () => {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS account_status VARCHAR(12) NOT NULL DEFAULT 'active'
      CHECK (account_status IN ('active','suspended','banned'))
    `)
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS status_note TEXT DEFAULT NULL')
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP DEFAULT NULL')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id SERIAL PRIMARY KEY,
        actor_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
        target_user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
        entity_type VARCHAR(30) NOT NULL,
        entity_id INTEGER DEFAULT NULL,
        action VARCHAR(50) NOT NULL,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    await pool.query(
      `INSERT INTO admin_settings (id, config)
       VALUES (1, $1::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(DEFAULT_ADMIN_SETTINGS)]
    )
  })().catch(err => {
    infraReadyPromise = null
    throw err
  })
  return infraReadyPromise
}

async function logAdminActivity({
  actorId,
  targetUserId = null,
  entityType,
  entityId = null,
  action,
  details = {},
}) {
  await pool.query(
    `INSERT INTO admin_activity_logs (actor_id, target_user_id, entity_type, entity_id, action, details)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [actorId || null, targetUserId, entityType, entityId, action, JSON.stringify(details)]
  )
}

function parseSort({ sortBy, sortDir, allowed, fallbackBy }) {
  const by = allowed.includes(sortBy) ? sortBy : fallbackBy
  const dir = String(sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC'
  return { by, dir }
}

async function getDashboard(req, res) {
  try {
    await ensureAdminInfrastructure()
    const [statsResult, activitiesResult] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE is_admin = false) AS total_users,
          (SELECT COUNT(*) FROM users WHERE is_admin = false AND role = 'seller') AS total_sellers,
          (SELECT COUNT(*) FROM identity_verifications WHERE verification_status IN ('pending','processing','review')) AS pending_kyc_requests,
          (SELECT COUNT(*) FROM products WHERE status = 'pending') AS pending_product_approvals,
          (SELECT COUNT(*) FROM products) AS total_listings,
          (SELECT COUNT(DISTINCT user_id) FROM identity_verifications WHERE jsonb_array_length(fraud_flags) > 0) AS fraud_flagged_users
      `),
      pool.query(`
        SELECT al.id, al.entity_type, al.entity_id, al.action, al.details, al.created_at,
               actor.full_name AS actor_name
        FROM admin_activity_logs al
        LEFT JOIN users actor ON actor.id = al.actor_id
        ORDER BY al.created_at DESC
        LIMIT 10
      `),
    ])
    const stats = statsResult.rows[0] || {}

    return res.json({
      success: true,
      dashboard: {
        total_users: parseInt(stats.total_users || 0, 10),
        total_sellers: parseInt(stats.total_sellers || 0, 10),
        pending_kyc_requests: parseInt(stats.pending_kyc_requests || 0, 10),
        pending_product_approvals: parseInt(stats.pending_product_approvals || 0, 10),
        total_listings: parseInt(stats.total_listings || 0, 10),
        fraud_flagged_users: parseInt(stats.fraud_flagged_users || 0, 10),
        recent_activities: activitiesResult.rows,
      },
    })
  } catch (err) {
    console.error('[admin.getDashboard]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getAdminProducts(req, res) {
  try {
    await ensureAdminInfrastructure()
    const {
      status = 'pending',
      search = '',
      sortBy = 'created_at',
      sortDir = 'desc',
      page = 1,
      limit = 20,
    } = req.query
    const { parsedPage, parsedLimit, offset } = toSafePagination(page, limit)
    const statuses = status === 'all' ? ['pending', 'approved', 'rejected', 'sold', 'booked'] : [status]
    const searchTerm = `%${String(search || '').trim()}%`
    const { by, dir } = parseSort({
      sortBy,
      sortDir,
      allowed: ['created_at', 'price', 'title'],
      fallbackBy: 'created_at',
    })

    const baseParams = [statuses, searchTerm]
    const rowsSql = `
      SELECT p.*, u.full_name as seller_name, u.email as seller_email,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as main_image,
             COUNT(*) OVER() as total_count
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.status = ANY($1)
        AND ($2 = '%%' OR p.title ILIKE $2 OR p.category ILIKE $2 OR u.full_name ILIKE $2 OR u.email ILIKE $2)
      ORDER BY ${by === 'price' ? 'p.price' : by === 'title' ? 'p.title' : 'p.created_at'} ${dir}
      LIMIT $3 OFFSET $4
    `
    const { rows: productRows } = await pool.query(rowsSql, [...baseParams, parsedLimit, offset])
    const total = productRows.length > 0 ? parseInt(productRows[0].total_count, 10) : 0
    return res.json({
      success: true,
      products: productRows,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit) || 1,
      },
    })
  } catch (err) {
    console.error('[admin.getAdminProducts]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function reviewProduct(req, res) {
  const { product_id, status, admin_note } = req.body
  if (!product_id || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'product_id and valid status required.' })
  }
  try {
    await ensureAdminInfrastructure()
    const { rows: productRows } = await pool.query(
      'SELECT id, seller_id, title FROM products WHERE id = $1 LIMIT 1',
      [product_id]
    )
    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' })
    }
    await pool.query(
      'UPDATE products SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, product_id]
    )
    const product = productRows[0]
    createNotification(
      product.seller_id,
      status === 'approved' ? 'product_approved' : 'product_rejected',
      `Listing ${status}`,
      `Your listing "${product.title}" has been ${status} by admin.${admin_note ? ` Note: ${admin_note}` : ''}`,
      status === 'approved' ? `/product/${product_id}` : '/profile'
    )
    await logAdminActivity({
      actorId: req.user?.id,
      targetUserId: product.seller_id,
      entityType: 'product',
      entityId: product_id,
      action: `product_${status}`,
      details: { admin_note: admin_note || null },
    })
    return res.json({ success: true, message: `Product marked as ${status}.` })
  } catch (err) {
    console.error('[admin.reviewProduct]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getAdminKyc(req, res) {
  try {
    await ensureAdminInfrastructure()
    const {
      status = 'pending',
      search = '',
      fraud = 'all',
      sortBy = 'created_at',
      sortDir = 'desc',
      page = 1,
      limit = 20,
    } = req.query
    const { parsedPage, parsedLimit, offset } = toSafePagination(page, limit)
    const statuses = status === 'all'
      ? ['pending', 'processing', 'review', 'approved', 'rejected']
      : status === 'pending'
        ? ['pending', 'processing', 'review']
        : [status]
    const searchTerm = `%${String(search || '').trim()}%`
    const fraudFilter = String(fraud || 'all')
    const { by, dir } = parseSort({
      sortBy,
      sortDir,
      allowed: ['created_at', 'confidence_score', 'ocr_confidence', 'face_match_score'],
      fallbackBy: 'created_at',
    })
    const sortColumn = by === 'confidence_score'
      ? 'n.confidence_score'
      : by === 'ocr_confidence'
        ? 'n.ocr_confidence'
        : by === 'face_match_score'
          ? 'n.face_match_score'
          : 'n.created_at'

    const params = [statuses, searchTerm]
    const fraudSql = fraudFilter === 'flagged'
      ? 'AND jsonb_array_length(n.fraud_flags) > 0'
      : fraudFilter === 'clean'
        ? 'AND jsonb_array_length(n.fraud_flags) = 0'
        : ''
    const whereSql = `
      WHERE n.verification_status = ANY($1)
        AND ($2 = '%%' OR u.full_name ILIKE $2 OR u.email ILIKE $2 OR n.nid_number ILIKE $2)
        ${fraudSql}
    `
    const rowsSql = `
      SELECT n.id, n.user_id, n.nid_number, n.full_name AS extracted_full_name, n.dob,
             n.ocr_confidence, n.face_match_score, n.confidence_score, n.fraud_flags,
             n.verification_status, n.review_source, n.review_note, n.ai_result,
             n.created_at, n.updated_at, n.processed_at, n.reviewed_at,
             u.full_name, u.email, u.phone,
             COUNT(*) OVER() as total_count
      FROM identity_verifications n
      JOIN users u ON n.user_id = u.id
      ${whereSql}
      ORDER BY ${sortColumn} ${dir}
      LIMIT $3 OFFSET $4
    `
    const { rows: submissionRows } = await pool.query(rowsSql, [...params, parsedLimit, offset])
    const total = submissionRows.length > 0 ? parseInt(submissionRows[0].total_count, 10) : 0
    return res.json({
      success: true,
      submissions: submissionRows.map(row => sanitizeVerification(row, { maskSensitive: false })),
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit) || 1,
      },
    })
  } catch (err) {
    console.error('[admin.getAdminKyc]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function reviewNid(req, res) {
  const { submission_id, verification_id, status, admin_note, review_note } = req.body
  const id = submission_id || verification_id
  if (!id || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'submission_id and valid status required.' })
  }
  try {
    await ensureAdminInfrastructure()
    const { rows: ownerRows } = await pool.query(
      'SELECT user_id FROM identity_verifications WHERE id = $1 LIMIT 1',
      [id]
    )
    await manualReview({
      verificationId: id,
      status,
      adminId: req.user.id,
      note: review_note || admin_note || null,
    })
    await logAdminActivity({
      actorId: req.user?.id,
      targetUserId: ownerRows[0]?.user_id || null,
      entityType: 'kyc',
      entityId: id,
      action: `kyc_${status}`,
      details: { note: review_note || admin_note || null },
    })
    return res.json({ success: true, message: `NID submission marked as ${status}.` })
  } catch (err) {
    console.error('[admin.reviewNid]', err)
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error.' })
  }
}

async function updateKycFlag(req, res) {
  try {
    await ensureAdminInfrastructure()
    const submissionId = toInt(req.params.submissionId, 0)
    const { action, flag } = req.body || {}
    if (!submissionId) return res.status(400).json({ success: false, message: 'Invalid submission id.' })
    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be 'add' or 'remove'." })
    }
    const normalizedFlag = String(flag || '').trim().toUpperCase().replace(/\s+/g, '_')
    if (!normalizedFlag) return res.status(400).json({ success: false, message: 'flag is required.' })

    const { rows } = await pool.query(
      'SELECT id, user_id, fraud_flags FROM identity_verifications WHERE id = $1 LIMIT 1',
      [submissionId]
    )
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Submission not found.' })

    const currentFlags = Array.isArray(rows[0].fraud_flags) ? rows[0].fraud_flags : []
    const nextSet = new Set(currentFlags.map(v => String(v).toUpperCase()))
    if (action === 'add') nextSet.add(normalizedFlag)
    if (action === 'remove') nextSet.delete(normalizedFlag)
    const nextFlags = Array.from(nextSet)

    await pool.query(
      `UPDATE identity_verifications
       SET fraud_flags = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(nextFlags), submissionId]
    )

    const { rows: updatedRows } = await pool.query(
      `SELECT n.id, n.user_id, n.nid_number, n.full_name AS extracted_full_name, n.dob,
              n.ocr_confidence, n.face_match_score, n.confidence_score, n.fraud_flags,
              n.verification_status, n.review_source, n.review_note, n.ai_result,
              n.created_at, n.updated_at, n.processed_at, n.reviewed_at,
              u.full_name, u.email, u.phone
       FROM identity_verifications n
       JOIN users u ON n.user_id = u.id
       WHERE n.id = $1
       LIMIT 1`,
      [submissionId]
    )

    await logAdminActivity({
      actorId: req.user?.id,
      targetUserId: rows[0].user_id,
      entityType: 'kyc',
      entityId: submissionId,
      action: `kyc_flag_${action}`,
      details: { flag: normalizedFlag, flags: nextFlags },
    })

    return res.json({
      success: true,
      message: `Flag ${action}ed.`,
      submission: sanitizeVerification(updatedRows[0], { maskSensitive: false }),
    })
  } catch (err) {
    console.error('[admin.updateKycFlag]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function blockNid(req, res) {
  const { submission_id, verification_id, reason } = req.body
  const id = submission_id || verification_id
  if (!id) return res.status(400).json({ success: false, message: 'submission_id is required.' })
  try {
    await ensureAdminInfrastructure()
    const { rows } = await pool.query(
      'SELECT user_id FROM identity_verifications WHERE id = $1 LIMIT 1',
      [id]
    )
    await blockNidForVerification({ verificationId: id, adminId: req.user.id, reason })
    await logAdminActivity({
      actorId: req.user?.id,
      targetUserId: rows[0]?.user_id || null,
      entityType: 'kyc',
      entityId: id,
      action: 'kyc_blocked',
      details: { reason: reason || null },
    })
    return res.json({ success: true, message: 'NID has been blocked.' })
  } catch (err) {
    console.error('[admin.blockNid]', err)
    return res.status(err.status || 500).json({ success: false, message: err.status ? err.message : 'Server error.' })
  }
}

async function getNidImage(req, res) {
  try {
    await ensureAdminInfrastructure()
    const { id, type } = req.params
    if (!['nid', 'selfie'].includes(type)) return res.status(400).json({ success: false, message: 'Invalid image type.' })
    const { rows } = await pool.query('SELECT nid_image_path, selfie_image_path FROM identity_verifications WHERE id = $1 LIMIT 1', [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Image not found.' })
    const imagePath = getSecureImagePath(rows[0], type)
    if (!imagePath) return res.status(404).json({ success: false, message: 'Image not found.' })
    return res.sendFile(imagePath)
  } catch (err) {
    console.error('[admin.getNidImage]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getAdminUsers(req, res) {
  try {
    await ensureAdminInfrastructure()
    const {
      search = '',
      role = 'all',
      account_status = 'all',
      verification = 'all',
      fraud = 'all',
      sortBy = 'created_at',
      sortDir = 'desc',
      page = 1,
      limit = 20,
    } = req.query
    const { parsedPage, parsedLimit, offset } = toSafePagination(page, limit)
    const searchTerm = `%${String(search || '').trim()}%`
    const numericSearchId = /^\d+$/.test(String(search || '').trim()) ? parseInt(String(search).trim(), 10) : null
    const { by, dir } = parseSort({
      sortBy,
      sortDir,
      allowed: ['created_at', 'full_name', 'email'],
      fallbackBy: 'created_at',
    })
    const sortColumn = by === 'full_name' ? 'u.full_name' : by === 'email' ? 'u.email' : 'u.created_at'

    const params = [searchTerm, req.user.id, numericSearchId]
    const conditions = [
      '($1 = \'%%\' OR u.full_name ILIKE $1 OR u.email ILIKE $1 OR ($3 IS NOT NULL AND u.id = $3))',
      '(u.id <> $2 OR u.is_admin = false)',
    ]
    if (role !== 'all') {
      params.push(role)
      conditions.push(`(CASE WHEN u.is_admin THEN 'admin' ELSE u.role END) = $${params.length}`)
    }
    if (account_status !== 'all') {
      params.push(account_status)
      conditions.push(`u.account_status = $${params.length}`)
    }
    if (verification === 'verified') {
      conditions.push('u.nid_verified = true')
    } else if (verification === 'unverified') {
      conditions.push('u.nid_verified = false')
    } else if (verification === 'pending') {
      conditions.push(`(latest_ver.verification_status IN ('pending','processing','review') OR latest_ver.verification_status IS NULL)`)
    } else if (verification === 'rejected') {
      conditions.push(`latest_ver.verification_status = 'rejected'`)
    }
    if (fraud === 'flagged') {
      conditions.push("COALESCE(jsonb_array_length(COALESCE(latest_ver.fraud_flags, '[]'::jsonb)), 0) > 0")
    } else if (fraud === 'clean') {
      conditions.push("COALESCE(jsonb_array_length(COALESCE(latest_ver.fraud_flags, '[]'::jsonb)), 0) = 0")
    }
    const whereSql = `WHERE ${conditions.join(' AND ')}`

    const baseFrom = `
      FROM users u
      LEFT JOIN LATERAL (
        SELECT iv.verification_status, iv.fraud_flags
        FROM identity_verifications iv
        WHERE iv.user_id = u.id
        ORDER BY iv.created_at DESC
        LIMIT 1
      ) latest_ver ON true
    `

    const limitPlaceholder = params.length + 1
    const offsetPlaceholder = params.length + 2
    const rowsSql = `
      SELECT
        u.id, u.full_name, u.email, u.role, u.is_admin, u.nid_verified, u.account_status, u.status_note, u.suspended_until, u.created_at,
        latest_ver.verification_status AS latest_verification_status,
        latest_ver.fraud_flags,
        COUNT(*) OVER() as total_count
      ${baseFrom}
      ${whereSql}
      ORDER BY ${sortColumn} ${dir}
      LIMIT $${limitPlaceholder} OFFSET $${offsetPlaceholder}
    `
    const { rows: userRows } = await pool.query(rowsSql, [...params, parsedLimit, offset])
    const total = userRows.length > 0 ? parseInt(userRows[0].total_count, 10) : 0
    return res.json({
      success: true,
      users: userRows.map(row => ({
        ...row,
        effective_role: row.is_admin ? 'admin' : row.role,
      })),
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit) || 1,
      },
    })
  } catch (err) {
    console.error('[admin.getAdminUsers]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function updateUserStatus(req, res) {
  try {
    await ensureAdminInfrastructure()
    const userId = toInt(req.params.userId, 0)
    const { status, note, suspend_until } = req.body || {}
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid user id.' })
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' })
    }
    if (status !== 'suspended' && suspend_until) {
      return res.status(400).json({ success: false, message: 'suspend_until is only allowed for suspended status.' })
    }
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own account status.' })
    }
    const { rows } = await pool.query(
      'SELECT id, full_name, email, is_admin FROM users WHERE id = $1 LIMIT 1',
      [userId]
    )
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' })
    if (rows[0].is_admin) return res.status(400).json({ success: false, message: 'Admin users cannot be suspended or banned.' })

    const suspendUntil = status === 'suspended' && suspend_until ? new Date(suspend_until) : null
    if (suspendUntil && Number.isNaN(suspendUntil.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid suspend_until date.' })
    }
    await pool.query(
      `UPDATE users
       SET account_status = $1,
           status_note = $2,
           suspended_until = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [status, note || null, status === 'suspended' ? suspendUntil : null, userId]
    )

    await logAdminActivity({
      actorId: req.user.id,
      targetUserId: userId,
      entityType: 'user',
      entityId: userId,
      action: `user_${status}`,
      details: {
        note: note || null,
        suspend_until: status === 'suspended' ? suspendUntil : null,
      },
    })

    return res.json({ success: true, message: `User has been marked as ${status}.` })
  } catch (err) {
    console.error('[admin.updateUserStatus]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getAdminSettings(req, res) {
  try {
    await ensureAdminInfrastructure()
    const { rows } = await pool.query('SELECT config, updated_at, updated_by FROM admin_settings WHERE id = 1 LIMIT 1')
    const row = rows[0] || { config: DEFAULT_ADMIN_SETTINGS, updated_at: null, updated_by: null }
    return res.json({
      success: true,
      settings: hydrateSettings(row.config || {}),
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    })
  } catch (err) {
    console.error('[admin.getAdminSettings]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function updateAdminSettings(req, res) {
  try {
    await ensureAdminInfrastructure()
    const payload = req.body?.settings
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, message: 'settings payload is required.' })
    }
    const current = await pool.query('SELECT config FROM admin_settings WHERE id = 1 LIMIT 1')
    const merged = hydrateSettings({
      ...(current.rows[0]?.config || {}),
      ...payload,
    })
    await pool.query(
      `INSERT INTO admin_settings (id, config, updated_by, updated_at)
       VALUES (1, $1::jsonb, $2, NOW())
       ON CONFLICT (id)
       DO UPDATE SET config = EXCLUDED.config, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [JSON.stringify(merged), req.user.id]
    )
    invalidateAdminSettingsCache()
    await logAdminActivity({
      actorId: req.user.id,
      entityType: 'settings',
      entityId: 1,
      action: 'settings_updated',
      details: { modules: Object.keys(payload || {}) },
    })
    return res.json({ success: true, message: 'Settings updated successfully.', settings: merged })
  } catch (err) {
    console.error('[admin.updateAdminSettings]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getAdminActivities(req, res) {
  try {
    await ensureAdminInfrastructure()
    const { page = 1, limit = 20, entity_type = 'all' } = req.query
    const { parsedPage, parsedLimit, offset } = toSafePagination(page, limit)
    const entityFilter = entity_type === 'all' ? '' : 'WHERE al.entity_type = $1'
    const params = entity_type === 'all' ? [] : [entity_type]
    const { rows: activityRows } = await pool.query(
      `SELECT al.id, al.entity_type, al.entity_id, al.action, al.details, al.created_at,
              actor.full_name AS actor_name,
              target.full_name AS target_user_name,
              COUNT(*) OVER() as total_count
       FROM admin_activity_logs al
       LEFT JOIN users actor ON actor.id = al.actor_id
       LEFT JOIN users target ON target.id = al.target_user_id
       ${entityFilter}
       ORDER BY al.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parsedLimit, offset]
    )
    const total = activityRows.length > 0 ? parseInt(activityRows[0].total_count, 10) : 0
    return res.json({
      success: true,
      activities: activityRows,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit) || 1,
      },
    })
  } catch (err) {
    console.error('[admin.getAdminActivities]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getStats(req, res) {
  return getDashboard(req, res)
}

async function getPendingProducts(req, res) {
  return getAdminProducts(req, res)
}

async function getPendingNid(req, res) {
  return getAdminKyc(req, res)
}

module.exports = {
  getDashboard,
  getStats,
  getAdminActivities,
  getAdminProducts,
  getPendingProducts,
  reviewProduct,
  getAdminKyc,
  getPendingNid,
  reviewNid,
  updateKycFlag,
  blockNid,
  getNidImage,
  getAdminUsers,
  updateUserStatus,
  getAdminSettings,
  updateAdminSettings,
}
