const pool = require('../config/db')
const aiService = require('../services/aiService')

// POST /api/ai/chatbot
async function chatWithBot(req, res) {
  const { message, history } = req.body
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message content is required.' })
  }

  try {
    // Fetch a list of active products to serve as context for the assistant
    const { rows: listings } = await pool.query(
      `SELECT id, category, title, price, location, attributes, description 
       FROM products 
       WHERE status = 'approved' 
       ORDER BY created_at DESC 
       LIMIT 30`
    )

    const response = await aiService.generateChatbotResponse(message, history || [], listings)
    return res.json({ success: true, response })
  } catch (err) {
    console.error('[chatbotController error]', err)
    return res.status(500).json({ success: false, message: 'Server error during chat.' })
  }
}

// POST /api/ai/compare
async function getComparison(req, res) {
  const { productIds } = req.body
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ success: false, message: 'An array of product IDs is required.' })
  }

  try {
    // Fetch products to compare
    const { rows: products } = await pool.query(
      `SELECT id, category, title, price, location, attributes, description 
       FROM products 
       WHERE id = ANY($1::int[]) AND status IN ('approved', 'sold', 'booked')`,
      [productIds.map(id => parseInt(id))]
    )

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching products found.' })
    }

    const summary = await aiService.generateComparisonSummary(products)
    return res.json({ success: true, summary, products })
  } catch (err) {
    console.error('[getComparison error]', err)
    return res.status(500).json({ success: false, message: 'Server error during comparison.' })
  }
}

// GET /api/ai/recommendations
async function getAiRecommendations(req, res) {
  const userId = req.user.id

  try {
    // 1. Fetch user profile
    const { rows: users } = await pool.query(
      'SELECT id, address, role FROM users WHERE id = $1 LIMIT 1',
      [userId]
    )
    const userProfile = users[0] || null

    // 2. Fetch user favourites
    const { rows: favourites } = await pool.query(
      `SELECT p.id, p.category, p.title, p.price, p.location, p.attributes, p.description 
       FROM favourites f 
       JOIN products p ON f.product_id = p.id 
       WHERE f.user_id = $1 AND p.status = 'approved'`,
      [userId]
    )

    // 3. Fetch purchase history (from orders/order_items)
    const { rows: purchaseHistory } = await pool.query(
      `SELECT p.id, p.category, p.title, p.price, p.location 
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       JOIN products p ON oi.product_id = p.id 
       WHERE o.buyer_id = $1 AND o.status = 'delivered'`,
      [userId]
    )

    // 4. Fetch available listings
    const { rows: listings } = await pool.query(
      `SELECT id, category, title, price, location, attributes, description, views 
       FROM products 
       WHERE status = 'approved' AND seller_id <> $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    )

    const result = await aiService.generateRecommendations(userProfile, favourites, purchaseHistory, listings)
    return res.json({
      success: true,
      summary: result.summary,
      recommendations: result.recommendations,
    })
  } catch (err) {
    console.error('[getAiRecommendations error]', err)
    return res.status(500).json({ success: false, message: 'Server error retrieving recommendations.' })
  }
}

module.exports = {
  chatWithBot,
  getComparison,
  getAiRecommendations,
}
