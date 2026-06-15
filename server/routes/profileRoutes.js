const express = require('express')
const rateLimit = require('express-rate-limit')
const { body } = require('express-validator')
const { getProfile, updateProfile, uploadAvatar } = require('../controllers/profileController')
const { verifyToken } = require('../middleware/authMiddleware')

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

/* ─── Validation rules for profile update ───────────────── */
const updateRules = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 3 })
        .withMessage('Full name must be at least 3 characters.'),
    body('phone')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone must be 20 characters or fewer.'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 300 })
        .withMessage('Address must be 300 characters or fewer.'),
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Bio must be 1000 characters or fewer.'),
]

/* ─── Routes (all protected) ────────────────────────────── */

// GET  /api/profile/me
router.get('/me', readLimiter, verifyToken, getProfile)

// PUT  /api/profile/me
router.put('/me', apiLimiter, verifyToken, updateRules, updateProfile)

// PUT  /api/profile/me/avatar
router.put('/me/avatar', apiLimiter, verifyToken, uploadAvatar)

module.exports = router
