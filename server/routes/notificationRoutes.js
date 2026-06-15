const express = require('express')
const { getNotifications, getUnreadCount, markRead, markAllRead } = require('../controllers/notificationController')
const { verifyToken } = require('../middleware/authMiddleware')

const router = express.Router()

router.use(verifyToken)

router.get('/', getNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/read-all', markAllRead)
router.patch('/:id/read', markRead)

module.exports = router
