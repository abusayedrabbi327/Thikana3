const jwt = require('jsonwebtoken')
const pool = require('../config/db')

function normalizeRole(role) {
  return role
}

let accountStatusReadyPromise = null
async function ensureAccountStatusColumns() {
  if (accountStatusReadyPromise) return accountStatusReadyPromise
  accountStatusReadyPromise = (async () => {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS account_status VARCHAR(12) NOT NULL DEFAULT 'active'
      CHECK (account_status IN ('active','suspended','banned'))
    `)
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP DEFAULT NULL')
    // One-time role normalization for legacy data.
    await pool.query("UPDATE users SET role = 'seller' WHERE role = 'owner'")
  })().catch(err => {
    accountStatusReadyPromise = null
    throw err
  })
  return accountStatusReadyPromise
}

function isBlockedAccount(user) {
  if (user.account_status === 'banned') {
    return { blocked: true, message: 'Your account has been banned. Contact support for help.' }
  }
  if (user.account_status === 'suspended') {
    if (!user.suspended_until || new Date() < new Date(user.suspended_until)) {
      return { blocked: true, message: 'Your account is currently suspended.' }
    }
  }
  return { blocked: false }
}

/**
 * verifyToken — Express middleware.
 * Expects: Authorization: Bearer <jwt_token>
 * Attaches decoded payload to req.user on success.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    await ensureAccountStatusColumns()
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { rows } = await pool.query(
      'SELECT id, email, role, is_admin, nid_verified, account_status, suspended_until FROM users WHERE id = $1 LIMIT 1',
      [decoded.id]
    )
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' })
    }
    const dbUser = rows[0]
    const accountBlock = isBlockedAccount(dbUser)
    if (accountBlock.blocked && !dbUser.is_admin) {
      return res.status(403).json({ success: false, message: accountBlock.message })
    }
    req.user = {
      ...decoded,
      id: dbUser.id,
      email: dbUser.email,
      role: normalizeRole(dbUser.is_admin ? 'admin' : dbUser.role),
      is_admin: !!dbUser.is_admin,
      nid_verified: !!dbUser.nid_verified,
      account_status: dbUser.account_status || 'active',
      suspended_until: dbUser.suspended_until || null,
    }
    next()
  } catch (err) {
    console.error('[verifyToken error]', err)
    const msg =
      err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : `Invalid token: ${err.message}`
    return res.status(401).json({ success: false, message: msg })
  }
}

async function optionalVerifyToken(req, _res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next()

  const token = authHeader.split(' ')[1]

  try {
    await ensureAccountStatusColumns()
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { rows } = await pool.query(
      'SELECT id, email, role, is_admin, nid_verified, account_status, suspended_until FROM users WHERE id = $1 LIMIT 1',
      [decoded.id]
    )
    if (rows.length === 0) return next()
    const dbUser = rows[0]
    const accountBlock = isBlockedAccount(dbUser)
    if (accountBlock.blocked && !dbUser.is_admin) return next()
    req.user = {
      ...decoded,
      id: dbUser.id,
      email: dbUser.email,
      role: normalizeRole(dbUser.is_admin ? 'admin' : dbUser.role),
      is_admin: !!dbUser.is_admin,
      nid_verified: !!dbUser.nid_verified,
      account_status: dbUser.account_status || 'active',
      suspended_until: dbUser.suspended_until || null,
    }
  } catch {
    // Public routes should remain public when an optional token is absent,
    // expired, or malformed.
  }
  next()
}

/**
 * requireRole(...roles) — role-based access control middleware.
 * Usage: router.get('/admin', verifyToken, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission.',
      })
    }
    next()
  }
}

/**
 * requireAdmin — only allow requests from users with is_admin = 1.
 * Must be used after verifyToken (which sets req.user).
 */
function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin access required.',
    })
  }
  next()
}

function requireBuyer(req, res, next) {
  if (req.user?.is_admin || req.user?.role !== 'buyer') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Buyer access required.',
    })
  }
  next()
}

function requireSeller(req, res, next) {
  if (req.user?.is_admin || req.user?.role !== 'seller') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Seller access required.',
    })
  }
  next()
}

function requireBuyerOrSeller(req, res, next) {
  if (req.user?.is_admin || !['buyer', 'seller'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Buyer or seller access required.',
    })
  }
  next()
}

function requireBuyerSellerOrAdmin(req, res, next) {
  if (req.user?.is_admin || ['buyer', 'seller'].includes(req.user?.role)) {
    return next()
  }
  return res.status(403).json({
    success: false,
    message: 'Forbidden. Buyer, seller, or admin access required.',
  })
}

function requireVerifiedNid(req, res, next) {
  if (!req.user?.nid_verified) {
    return res.status(403).json({
      success: false,
      message: 'Complete NID verification to access this feature.',
    })
  }
  next()
}

module.exports = {
  verifyToken,
  optionalVerifyToken,
  requireRole,
  requireAdmin,
  requireBuyer,
  requireSeller,
  requireBuyerOrSeller,
  requireBuyerSellerOrAdmin,
  requireVerifiedNid,
}
