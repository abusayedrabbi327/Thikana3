const { validationResult } = require('express-validator')
const pool = require('../config/db')
const { createNotification } = require('./notificationController')
const aiService = require('../services/aiService')

async function addReview(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() })
  const { order_item_id, rating, comment } = req.body
  const buyerId = req.user.id
  try {
    const { rows: orders } = await pool.query(`
      SELECT oi.id, oi.product_id, oi.seller_id, o.buyer_id, o.status as order_status
      FROM order_items oi JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = $1 AND o.buyer_id = $2
    `, [order_item_id, buyerId])
    if (orders.length === 0) return res.status(403).json({ success: false, message: 'Invalid order item or unauthorized.' })
    const { product_id, seller_id, order_status } = orders[0]
    if (order_status !== 'delivered') return res.status(400).json({ success: false, message: 'You can only review delivered orders.' })
    
    // Analyze sentiment using Gemini NLP service
    let sentimentLabel = 'neutral'
    let sentimentScore = 0.5
    let nlpInsights = 'Standard review'
    
    if (comment && comment.trim()) {
      try {
        const sentimentResult = await aiService.analyzeSentiment(comment)
        sentimentLabel = sentimentResult.sentiment
        sentimentScore = sentimentResult.score
        nlpInsights = sentimentResult.insights?.join(', ') || ''
      } catch (err) {
        console.error('[reviewSentiment error, using fallback]', err)
      }
    }

    await pool.query(
      `INSERT INTO reviews (order_item_id, buyer_id, seller_id, product_id, rating, comment, sentiment_label, sentiment_score, nlp_insights) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [order_item_id, buyerId, seller_id, product_id, rating, comment?.trim() || null, sentimentLabel, sentimentScore, nlpInsights]
    )
    
    createNotification(seller_id, 'system', 'New Product Review! ⭐', `You received a ${rating}-star review for one of your products.`, `/product/${product_id}`)
    
    return res.status(201).json({ 
      success: true, 
      message: 'Review added successfully!',
      sentiment: { sentiment: sentimentLabel, score: sentimentScore, insights: nlpInsights.split(', ') }
    })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'You have already reviewed this item.' })
    console.error('[addReview error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getProductReviews(req, res) {
  try {
    const { id } = req.params
    const { rows: reviews } = await pool.query(`
      SELECT r.id, r.rating, r.comment, r.sentiment_label, r.sentiment_score, r.nlp_insights, r.created_at,
             u.full_name as buyer_name, u.avatar_url as buyer_avatar
      FROM reviews r JOIN users u ON r.buyer_id = u.id
      WHERE r.product_id = $1 ORDER BY r.created_at DESC
    `, [id])
    const total = reviews.length
    const avgRating = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : 0
    return res.json({ success: true, reviews, avgRating, total })
  } catch (err) {
    console.error('[getProductReviews error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

module.exports = { addReview, getProductReviews }
