const express = require('express')
const rateLimit = require('express-rate-limit')
const { getConversations, getMessages, sendMessage, markConversationRead, getUnreadMessageCount } = require('../controllers/messageController')
const { verifyToken, requireBuyerOrSeller, requireVerifiedNid } = require('../middleware/authMiddleware')

const router = express.Router()

const messageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many message requests. Please try again later.' },
})

router.use(messageLimiter, verifyToken, requireBuyerOrSeller, requireVerifiedNid)

router.get('/conversations', getConversations)
router.get('/unread-count', getUnreadMessageCount)
router.post('/', sendMessage)
router.get('/:userId', getMessages)
router.patch('/:userId/read', markConversationRead)

module.exports = router
