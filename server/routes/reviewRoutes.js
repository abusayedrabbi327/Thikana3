const express = require('express')
const rateLimit = require('express-rate-limit')
const { body } = require('express-validator')
const router = express.Router()

const { addReview, getProductReviews } = require('../controllers/reviewController')
const { verifyToken, requireBuyer } = require('../middleware/authMiddleware')

const reviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many review requests. Please try again later.' },
})

// Public routes
router.get('/product/:id', reviewLimiter, getProductReviews)

// Protected routes
router.post('/', reviewLimiter, verifyToken, requireBuyer, [
    body('order_item_id').isInt().withMessage('Valid order item ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional({ nullable: true, checkFalsy: true }).isString(),
], addReview)

module.exports = router
