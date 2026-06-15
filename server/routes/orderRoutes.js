const express = require('express')
const rateLimit = require('express-rate-limit')
const { placeOrder, placeBooking, getMyOrders, getSellerOrders, getOrderById, updateOrderStatus } = require('../controllers/orderController')
const { verifyToken, requireBuyer, requireSeller, requireBuyerSellerOrAdmin, requireVerifiedNid } = require('../middleware/authMiddleware')

const router = express.Router()

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
})

const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
})

router.post('/', apiLimiter, verifyToken, requireBuyer, requireVerifiedNid, placeOrder)
router.post('/booking', apiLimiter, verifyToken, requireBuyer, requireVerifiedNid, placeBooking)
router.get('/', readLimiter, verifyToken, requireBuyer, getMyOrders)
router.get('/seller', readLimiter, verifyToken, requireSeller, requireVerifiedNid, getSellerOrders)
router.get('/:id', readLimiter, verifyToken, requireBuyerSellerOrAdmin, getOrderById)
router.patch('/:id/status', apiLimiter, verifyToken, requireBuyerSellerOrAdmin, updateOrderStatus)

module.exports = router
