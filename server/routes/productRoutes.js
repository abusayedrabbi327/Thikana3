const express = require('express')
const rateLimit = require('express-rate-limit')
const { uploadProduct, getProducts, reviewProduct, getProductById, editProduct, getPublicStats } = require('../controllers/productController')
const { verifyToken, optionalVerifyToken, requireAdmin, requireSeller, requireVerifiedNid } = require('../middleware/authMiddleware')

const router = express.Router()

// General rate limiter for write/auth-checking product endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
})

// More permissive limiter for public read endpoints
const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
})

// GET /api/products/stats  (public — no auth needed)
router.get('/stats', readLimiter, getPublicStats)

// GET /api/products
// Fetch all products (supports ?status=...&category=...)
router.get('/', readLimiter, optionalVerifyToken, getProducts)

// POST /api/products
// Upload a new product (Verified sellers only)
router.post('/', apiLimiter, verifyToken, requireSeller, requireVerifiedNid, uploadProduct)

// GET /api/products/:id
// Fetch a single product detailing
router.get('/:id', readLimiter, optionalVerifyToken, getProductById)

// PATCH /api/products/:id
// Edit product (Verified sellers only — ownership also verified in controller)
router.patch('/:id', apiLimiter, verifyToken, requireSeller, requireVerifiedNid, editProduct)

// POST /api/products/admin/review
// Admin-only: approve or reject products.
router.post('/admin/review', apiLimiter, verifyToken, requireAdmin, reviewProduct)

module.exports = router
