const pool = require('../config/db')

function normalizeRole(role) {
  return role
}

function canUsersChat(sender, receiver) {
  if (!sender || !receiver) return { allowed: false, message: 'Chat participant not found.' }
  if (sender.id === receiver.id) return { allowed: false, message: 'You cannot message yourself.' }
  if (sender.is_admin || receiver.is_admin) return { allowed: false, message: 'Admins cannot use direct chat.' }
  if (!sender.nid_verified) return { allowed: false, message: 'Complete NID verification to chat.' }
  if (sender.role === 'buyer') {
    if (receiver.role !== 'seller') return { allowed: false, message: 'Buyers can only chat with sellers.' }
    if (!receiver.nid_verified) return { allowed: false, message: 'Seller must be NID verified for chat.' }
    return { allowed: true }
  }
  if (sender.role === 'seller') {
    if (receiver.role === 'seller') {
      if (!receiver.nid_verified) return { allowed: false, message: 'Seller must be NID verified for chat.' }
      return { allowed: true }
    }
    if (receiver.role === 'buyer') {
      if (!receiver.nid_verified) return { allowed: false, message: 'Buyer must be NID verified for chat.' }
      return { allowed: true }
    }
  }
  return { allowed: false, message: 'This chat is not allowed for your account type.' }
}

async function getUserAccount(userId) {
  const { rows } = await pool.query('SELECT id, role, is_admin, nid_verified FROM users WHERE id = $1 LIMIT 1', [userId])
  if (rows.length === 0) return null
  const dbUser = rows[0]
  return { id: dbUser.id, role: normalizeRole(dbUser.is_admin ? 'admin' : dbUser.role), is_admin: !!dbUser.is_admin, nid_verified: !!dbUser.nid_verified }
}

async function ensureChatPermission(reqUser, partnerId) {
  const partner = await getUserAccount(partnerId)
  if (!partner) return { ok: false, status: 404, message: 'Chat user not found.' }
  const check = canUsersChat(reqUser, partner)
  if (!check.allowed) return { ok: false, status: 403, message: check.message }
  return { ok: true, partner }
}

async function getConversations(req, res) {
  try {
    const userId = req.user.id
    if (req.user.is_admin || !req.user.nid_verified) {
      return res.json({ success: true, conversations: [] })
    }
    if (!['buyer', 'seller'].includes(req.user.role)) {
      return res.json({ success: true, conversations: [] })
    }
    const { rows } = await pool.query(`
      SELECT
        partner_id,
        u.full_name as partner_name, u.avatar_url as partner_avatar,
        u.role as partner_role, u.is_admin as partner_is_admin, u.nid_verified as partner_verified,
        last_msg.content as last_message,
        convos.last_message_at,
        convos.unread_count,
        last_msg.product_id,
        p.title as product_title
      FROM (
        SELECT
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as partner_id,
          MAX(created_at) as last_message_at,
          SUM(CASE WHEN receiver_id = $1 AND is_read = false THEN 1 ELSE 0 END)::int as unread_count
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
        GROUP BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
      ) as convos
      JOIN users u ON u.id = convos.partner_id
      LEFT JOIN LATERAL (
        SELECT content, product_id
        FROM messages m2
        WHERE (m2.sender_id = $1 AND m2.receiver_id = convos.partner_id)
           OR (m2.receiver_id = $1 AND m2.sender_id = convos.partner_id)
        ORDER BY m2.created_at DESC LIMIT 1
      ) last_msg ON true
      LEFT JOIN products p ON p.id = last_msg.product_id
      WHERE (u.is_admin = false)
        AND ($1 != u.id)
        AND (
          CASE
            WHEN $2 = 'buyer' THEN (u.role = 'seller' AND u.nid_verified = true)
            WHEN $2 = 'seller' THEN (u.role IN ('buyer', 'seller') AND u.nid_verified = true)
            ELSE false
          END
        )
      ORDER BY convos.last_message_at DESC
    `, [userId, req.user.role])
    return res.json({ success: true, conversations: rows })
  } catch (err) {
    console.error('[getConversations error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getMessages(req, res) {
  try {
    const userId = req.user.id
    const partnerId = parseInt(req.params.userId)
    const { product_id, page = 1, limit = 50 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
    const permission = await ensureChatPermission(req.user, partnerId)
    if (!permission.ok) return res.status(permission.status).json({ success: false, message: permission.message })
    let where = '((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))'
    const params = [userId, partnerId]
    let pi = 3
    if (product_id) { where += ` AND product_id = $${pi++}`; params.push(product_id) }
    const { rows } = await pool.query(
      `SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE ${where} ORDER BY m.created_at ASC LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, parseInt(limit), offset]
    )
    const { rows: partners } = await pool.query('SELECT id, full_name, avatar_url, nid_verified FROM users WHERE id = $1', [partnerId])
    return res.json({ success: true, messages: rows, partner: partners[0] || null })
  } catch (err) {
    console.error('[getMessages error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function sendMessage(req, res) {
  const { receiver_id, content, product_id } = req.body
  const receiverIdNum = parseInt(receiver_id)
  if (!receiver_id || !content?.trim()) return res.status(400).json({ success: false, message: 'Receiver and message content are required.' })
  if (receiverIdNum === req.user.id) return res.status(400).json({ success: false, message: 'You cannot message yourself.' })
  try {
    const permission = await ensureChatPermission(req.user, receiverIdNum)
    if (!permission.ok) return res.status(permission.status).json({ success: false, message: permission.message })
    const { rows: insertRows } = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, product_id, content) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, receiverIdNum, product_id || null, content.trim()]
    )
    const { rows: msg } = await pool.query(
      'SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1',
      [insertRows[0].id]
    )
    return res.status(201).json({ success: true, message: msg[0] })
  } catch (err) {
    console.error('[sendMessage error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function markConversationRead(req, res) {
  try {
    const partnerId = parseInt(req.params.userId)
    const permission = await ensureChatPermission(req.user, partnerId)
    if (!permission.ok) return res.status(permission.status).json({ success: false, message: permission.message })
    await pool.query('UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false', [partnerId, req.user.id])
    return res.json({ success: true })
  } catch (err) {
    console.error('[markConversationRead error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getUnreadMessageCount(req, res) {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false', [req.user.id])
    return res.json({ success: true, count: parseInt(rows[0].count) })
  } catch (err) {
    console.error('[getUnreadMessageCount error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

module.exports = { getConversations, getMessages, sendMessage, markConversationRead, getUnreadMessageCount }
