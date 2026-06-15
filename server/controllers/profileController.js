const { validationResult } = require('express-validator')
const pool = require('../config/db')
const { saveBase64Image } = require('../utils/fileUpload')

/* ── Helper: strip password hash ─────────────────────────── */
function safeUser(row) {
  const {
    password,
    otp_code,
    otp_expires_at,
    reset_token,
    reset_token_expires_at,
    ...user
  } = row
  const role = row?.is_admin ? 'admin' : row?.role
  return { ...user, role }
}

/* ─────────────────────────────────────────────────────────
   GET /api/profile/me
   Header: Authorization: Bearer <token>
───────────────────────────────────────────────────────── */
async function getProfile(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' })

    // Combine buyer stats (orders, favorites, reviews) into one query
    const buyerStatsQuery = `
      SELECT
        (SELECT COUNT(*) FROM orders WHERE buyer_id = $1 AND status != 'cancelled') as orders,
        (SELECT COUNT(*) FROM favourites WHERE user_id = $1) as favorites,
        (SELECT COUNT(*) FROM reviews WHERE buyer_id = $1) as reviews
    `

    // Combine seller stats (active_listings, seller_orders, total_sales) into one query
    const sellerStatsQuery = `
      SELECT
        (SELECT COUNT(*) FROM products WHERE seller_id = $1 AND status = 'approved') as active_listings,
        (SELECT COUNT(DISTINCT oi.order_id) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.seller_id = $1 AND o.status != 'cancelled') as seller_orders,
        (SELECT COALESCE(SUM(oi.price * oi.quantity), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.seller_id = $1 AND o.status != 'cancelled') as total_sales
    `

    const [buyerStats, sellerStats] = await Promise.all([
      pool.query(buyerStatsQuery, [req.user.id]),
      pool.query(sellerStatsQuery, [req.user.id])
    ])

    return res.json({
      success: true,
      user: safeUser(rows[0]),
      stats: {
        orders: parseInt(buyerStats.rows[0].orders) || 0,
        seller_orders: parseInt(sellerStats.rows[0].seller_orders) || 0,
        favorites: parseInt(buyerStats.rows[0].favorites) || 0,
        active_listings: parseInt(sellerStats.rows[0].active_listings) || 0,
        total_sales: parseFloat(sellerStats.rows[0].total_sales) || 0,
        reviews: parseInt(buyerStats.rows[0].reviews) || 0,
        points: rows[0].points || 0
      }
    })
  } catch (err) {
    console.error('[getProfile error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ─────────────────────────────────────────────────────────
   PUT /api/profile/me
   Header: Authorization: Bearer <token>
   Body: { fullName?, phone?, address?, bio? }
───────────────────────────────────────────────────────── */
async function updateProfile(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ success: false, message: 'Validation failed', errors: errors.array() })
  const { fullName, phone, address, bio } = req.body
  try {
    const fields = []
    const values = []
    let pi = 1
    if (fullName !== undefined) { fields.push(`full_name = $${pi++}`); values.push(fullName.trim()) }
    if (phone !== undefined) { fields.push(`phone = $${pi++}`); values.push(phone.trim() || null) }
    if (address !== undefined) { fields.push(`address = $${pi++}`); values.push(address.trim() || null) }
    if (bio !== undefined) { fields.push(`bio = $${pi++}`); values.push(bio.trim() || null) }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update.' })
    values.push(req.user.id)
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${pi}`, values)
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    return res.json({ success: true, message: 'Profile updated successfully!', user: safeUser(rows[0]) })
  } catch (err) {
    console.error('[updateProfile error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ─────────────────────────────────────────────────────────
   PUT /api/profile/avatar
   Header: Authorization: Bearer <token>
   Body: { avatar_base64 }
───────────────────────────────────────────────────────── */
async function uploadAvatar(req, res) {
  const { avatar_base64 } = req.body
  if (!avatar_base64) return res.status(400).json({ success: false, message: 'No image provided.' })
  try {
    const avatarUrl = saveBase64Image(avatar_base64, 'avatars', `user-${req.user.id}`)
    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user.id])
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    return res.json({ success: true, message: 'Profile picture updated!', user: safeUser(rows[0]) })
  } catch (err) {
    console.error('[uploadAvatar error]', err)
    if (err.message.includes('Invalid') || err.message.includes('Unsupported')) return res.status(400).json({ success: false, message: err.message })
    return res.status(500).json({ success: false, message: 'Server error while uploading image.' })
  }
}

module.exports = { getProfile, updateProfile, uploadAvatar }
