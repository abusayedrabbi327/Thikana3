const express = require('express')
const rateLimit = require('express-rate-limit')
const { chatWithBot, getComparison, getAiRecommendations } = require('../controllers/aiController')
const { verifyToken, optionalVerifyToken } = require('../middleware/authMiddleware')

const router = express.Router()

// Dedicated rate limiter for AI queries
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please try again in a few minutes.' },
})

// POST /api/ai/chatbot
// Allows optional authentication to tailor responses
router.post('/chatbot', aiLimiter, optionalVerifyToken, chatWithBot)

// POST /api/ai/compare
// Publicly accessible product comparison route
router.post('/compare', aiLimiter, getComparison)

// GET /api/ai/recommendations
// Requires user to be logged in to compile custom profile recommendations
router.get('/recommendations', aiLimiter, verifyToken, getAiRecommendations)

module.exports = router
