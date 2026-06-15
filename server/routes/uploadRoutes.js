const express = require('express')
const multer = require('multer')
const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')
const { verifyToken, requireBuyerOrSeller, requireVerifiedNid } = require('../middleware/authMiddleware')

const router = express.Router()

// Ensure upload directories exist
const dirs = ['chat-images', 'chat-files', 'chat-voice']
dirs.forEach(d => {
  const p = path.join(__dirname, '..', 'uploads', d)
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
})

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const type = req.params.type || 'files'
    const map = { image: 'chat-images', file: 'chat-files', voice: 'chat-voice' }
    cb(null, path.join(__dirname, '..', 'uploads', map[type] || 'chat-files'))
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedExts = /^(jpeg|jpg|png|gif|webp|pdf|doc|docx|zip|mp3|wav|ogg|webm|m4a)$/
    const allowedMimes = /^(image\/(jpeg|png|gif|webp)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|zip)|audio\/(mpeg|wav|ogg|webm|mp4|x-m4a))$/
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '')
    if (allowedExts.test(ext) && allowedMimes.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported file type.'))
    }
  },
})

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many upload requests. Please try again later.' },
})

router.use(uploadLimiter, verifyToken, requireBuyerOrSeller, requireVerifiedNid)

/**
 * POST /api/upload/chat/:type  — type is 'image', 'file', or 'voice'
 * Accepts multipart/form-data with field name 'file'
 */
router.post('/:type', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' })
  }

  const type = req.params.type
  const map = { image: 'chat-images', file: 'chat-files', voice: 'chat-voice' }
  const dir = map[type] || 'chat-files'
  const fileUrl = `/uploads/${dir}/${req.file.filename}`

  return res.json({
    success: true,
    file_url: fileUrl,
    file_name: req.file.originalname,
    file_size: req.file.size,
    mime_type: req.file.mimetype,
  })
})

router.use((err, _req, res, _next) => {
  if (err) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return res.status(status).json({ success: false, message: err.message || 'Upload failed.' })
  }
})

module.exports = router
