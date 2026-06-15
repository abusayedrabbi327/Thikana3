const pool = require('../config/db')

async function sendInquiry(req, res) {
  const { product_id, message, sender_phone } = req.body
  const sender_id = req.user.id
  if (!product_id || !message?.trim()) return res.status(400).json({ success: false, message: 'Product and message are required.' })
  try {
    const { rows: prods } = await pool.query("SELECT seller_id, title FROM products WHERE id = $1 AND status IN ('approved','sold')", [product_id])
    if (prods.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' })
    const { seller_id, title } = prods[0]
    if (seller_id === sender_id) return res.status(400).json({ success: false, message: 'You cannot inquire about your own listing.' })
    const { rows: senders } = await pool.query('SELECT full_name FROM users WHERE id = $1', [sender_id])
    const sender_name = senders[0]?.full_name || 'Anonymous'
    await pool.query(
      'INSERT INTO inquiries (product_id, sender_id, seller_id, message, sender_name, sender_phone) VALUES ($1, $2, $3, $4, $5, $6)',
      [product_id, sender_id, seller_id, message.trim(), sender_name, sender_phone?.trim() || null]
    )
    return res.status(201).json({ success: true, message: 'Your inquiry has been sent to the seller.' })
  } catch (err) {
    console.error('[sendInquiry error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getSellerInquiries(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, p.title as product_title, p.category as product_category,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as product_image
      FROM inquiries i JOIN products p ON i.product_id = p.id
      WHERE i.seller_id = $1 ORDER BY i.created_at DESC
    `, [req.user.id])
    return res.json({ success: true, inquiries: rows })
  } catch (err) {
    console.error('[getSellerInquiries error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function markRead(req, res) {
  const { id } = req.params
  try {
    await pool.query('UPDATE inquiries SET is_read = true WHERE id = $1 AND seller_id = $2', [id, req.user.id])
    return res.json({ success: true })
  } catch (err) {
    console.error('[markRead error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getUnreadCount(req, res) {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM inquiries WHERE seller_id = $1 AND is_read = false', [req.user.id])
    return res.json({ success: true, count: parseInt(rows[0].count) })
  } catch (err) {
    console.error('[getUnreadCount error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

module.exports = { sendInquiry, getSellerInquiries, markRead, getUnreadCount }
