const express = require('express')
const rateLimit = require('express-rate-limit')
const { body } = require('express-validator')
const { signup, verifyEmail, resendOtp, login, me, refresh, logout, forgotPassword, resetPassword, changePassword } = require('../controllers/authController')
const { verifyToken } = require('../middleware/authMiddleware')

const router = express.Router()

// Rate limiters for sensitive auth endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please try again later.' },
})

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many session refresh requests. Please try again later.' },
})

const signupRules = [
  body('fullName').trim().isLength({ min: 3 }).withMessage('Full name must be at least 3 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller.'),
]

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
]

router.post('/signup', strictLimiter, signupRules, signup)
router.post('/verify-email', otpLimiter, verifyEmail)
router.post('/resend-otp', otpLimiter, resendOtp)
router.post('/login', strictLimiter, loginRules, login)
router.post('/refresh', refreshLimiter, refresh)
router.post('/logout', strictLimiter, logout)
router.get('/me', verifyToken, me)
router.post('/forgot-password', strictLimiter, forgotPassword)
router.post('/reset-password', strictLimiter, resetPassword)
router.post('/change-password', strictLimiter, verifyToken, changePassword)

module.exports = router
