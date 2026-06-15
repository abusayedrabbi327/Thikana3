const express = require('express')
const rateLimit = require('express-rate-limit')
const { sendInquiry, getSellerInquiries, markRead, getUnreadCount } = require('../controllers/inquiryController')
const { verifyToken, requireBuyer, requireSeller, requireVerifiedNid } = require('../middleware/authMiddleware')

const router = express.Router()

const inquiryLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many inquiries sent. Please try again later.' },
})

const inquiryReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many inquiry requests. Please try again later.' },
})

router.post('/', inquiryLimiter, verifyToken, requireBuyer, requireVerifiedNid, sendInquiry)
router.get('/seller', inquiryReadLimiter, verifyToken, requireSeller, requireVerifiedNid, getSellerInquiries)
router.get('/unread-count', inquiryReadLimiter, verifyToken, requireSeller, requireVerifiedNid, getUnreadCount)
router.patch('/:id/read', inquiryReadLimiter, verifyToken, requireSeller, requireVerifiedNid, markRead)

module.exports = router
