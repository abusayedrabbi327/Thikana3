const express = require('express')
const rateLimit = require('express-rate-limit')
const { getFavourites, toggleFavourite, getFavouriteStatus } = require('../controllers/favouriteController')
const { verifyToken, requireBuyer } = require('../middleware/authMiddleware')

const router = express.Router()

const favouriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many favourite requests. Please try again later.' },
})

router.get('/', favouriteLimiter, verifyToken, requireBuyer, getFavourites)
router.post('/:productId', favouriteLimiter, verifyToken, requireBuyer, toggleFavourite)
router.get('/:productId/status', favouriteLimiter, verifyToken, requireBuyer, getFavouriteStatus)

module.exports = router
