require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { initSocket } = require('./socket')
const { cleanupRejectedImages } = require('./services/identityVerificationService')

const authRoutes = require('./routes/authRoutes')
const profileRoutes = require('./routes/profileRoutes')
const nidRoutes = require('./routes/nidRoutes')
const productRoutes = require('./routes/productRoutes')
const favouriteRoutes = require('./routes/favouriteRoutes')
const inquiryRoutes = require('./routes/inquiryRoutes')
const adminRoutes = require('./routes/adminRoutes')
const cartRoutes = require('./routes/cartRoutes')
const orderRoutes = require('./routes/orderRoutes')
const messageRoutes = require('./routes/messageRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const uploadRoutes = require('./routes/uploadRoutes')
const reviewRoutes = require('./routes/reviewRoutes')
const aiRoutes = require('./routes/aiRoutes')

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000

app.set('trust proxy', 1)

// Initialize Socket.io
initSocket(server)

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
// Sibling uploads fallback middleware to load files from other versions (e.g. Thikana)
app.use('/uploads', (req, res, next) => {
  const fs = require('fs')
  if (req.path.includes('..')) {
    return next()
  }
  const localPath = path.join(__dirname, 'uploads', req.path)
  if (fs.existsSync(localPath)) {
    return next()
  }
  try {
    const parentDir = path.resolve(__dirname, '..', '..') // 'd:\UIU\13 trimester\Mobile app'
    const siblings = fs.readdirSync(parentDir)
    for (const sib of siblings) {
      const sibPath = path.join(parentDir, sib)
      const stat = fs.statSync(sibPath)
      if (stat.isDirectory() && sib !== path.basename(path.resolve(__dirname, '..'))) {
        const possiblePaths = [
          path.join(sibPath, 'server', 'uploads', req.path),
          path.join(sibPath, 'uploads', req.path)
        ]
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            return res.sendFile(p)
          }
        }
      }
    }
  } catch (err) {
    console.error('[uploads fallback error]', err)
  }
  next()
})

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d', immutable: true }))

app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/nid', nidRoutes)
app.use('/api/products', productRoutes)
app.use('/api/favourites', favouriteRoutes)
app.use('/api/inquiries', inquiryRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/upload/chat', uploadRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/ai', aiRoutes)

app.get('/api/health', (_req, res) => res.json({ success: true, message: '🏠 Thikana API is running', timestamp: new Date().toISOString() }))
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }))
app.use((err, _req, res, _next) => { console.error('[unhandled error]', err); res.status(500).json({ success: false, message: 'Internal server error.' }) })

server.listen(PORT, () => {
  console.log(`\n🚀 Thikana API running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔌 Socket.io enabled\n`)
})

setInterval(() => {
  cleanupRejectedImages().catch(err => console.error('[identity cleanup]', err))
}, 60 * 60 * 1000)
