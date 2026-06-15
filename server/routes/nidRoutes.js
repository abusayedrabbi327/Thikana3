const express = require('express')
const rateLimit = require('express-rate-limit')
const { getNidStatus, submitNid } = require('../controllers/nidController')
const { verifyToken } = require('../middleware/authMiddleware')

const router = express.Router()
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification submissions. Please try again later.' },
})

router.get('/status', verifyToken, getNidStatus)
router.post('/submit', submitLimiter, verifyToken, submitNid)

module.exports = router
