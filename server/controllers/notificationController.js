const pool = require('../config/db')

/**
 * Helper: create a notification (used by other controllers)
 */
async function createNotification(userId, type, title, body, link = null) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)',
      [userId, type, title, body || null, link]
    )
  } catch (err) {
    console.error('[createNotification error]', err)
  }
}

async function getNotifications(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
    const { rows } = await pool.query(
      'SELECT *, COUNT(*) OVER() as total_count FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, parseInt(limit), offset]
    )
    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0
    return res.json({ success: true, notifications: rows, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } })
  } catch (err) {
    console.error('[getNotifications error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getUnreadCount(req, res) {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id])
    return res.json({ success: true, count: parseInt(rows[0].count) })
  } catch (err) {
    console.error('[getUnreadCount error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function markRead(req, res) {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    return res.json({ success: true })
  } catch (err) {
    console.error('[markRead error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function markAllRead(req, res) {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [req.user.id])
    return res.json({ success: true })
  } catch (err) {
    console.error('[markAllRead error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

module.exports = { createNotification, getNotifications, getUnreadCount, markRead, markAllRead }
