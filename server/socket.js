const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const pool = require('./config/db')

let io = null

function normalizeRole(role) {
  return role
}

function canUsersChat(sender, receiver) {
  if (!sender || !receiver) return { allowed: false, message: 'Chat participant not found.' }
  if (sender.is_admin || receiver.is_admin) return { allowed: false, message: 'Admins cannot use direct chat.' }
  if (!sender.nid_verified) return { allowed: false, message: 'Complete NID verification to chat.' }
  if (sender.role === 'buyer') {
    if (receiver.role !== 'seller') return { allowed: false, message: 'Buyers can only chat with sellers.' }
    if (!receiver.nid_verified) return { allowed: false, message: 'Seller must be NID verified for chat.' }
    return { allowed: true }
  }
  if (sender.role === 'seller') {
    if (receiver.role === 'seller') {
      if (!receiver.nid_verified) return { allowed: false, message: 'Seller must be NID verified for chat.' }
      return { allowed: true }
    }
    if (receiver.role === 'buyer') {
      if (!receiver.nid_verified) return { allowed: false, message: 'Buyer must be NID verified for chat.' }
      return { allowed: true }
    }
  }
  return { allowed: false, message: 'This chat is not allowed for your account type.' }
}

async function getUserAccount(userId) {
  const { rows } = await pool.query('SELECT id, role, is_admin, nid_verified FROM users WHERE id = $1 LIMIT 1', [userId])
  if (rows.length === 0) return null
  const row = rows[0]
  return { id: row.id, role: normalizeRole(row.is_admin ? 'admin' : row.role), is_admin: !!row.is_admin, nid_verified: !!row.nid_verified }
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const account = await getUserAccount(decoded.id)
      if (!account) return next(new Error('Account not found'))
      socket.user = { ...decoded, ...account }
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.user.id
    socket.join(`user_${userId}`)
    console.log(`🔌 Socket connected: user ${userId}`)
    socket.broadcast.emit('user_online', { userId })

    socket.on('send_message', async (data, callback) => {
      const { receiver_id, content, product_id, type, file_url, file_name } = data
      if (!receiver_id) return
      if (type === 'text' && !content?.trim()) return
      if ((type === 'image' || type === 'file' || type === 'voice') && !file_url) return
      try {
        const sender = await getUserAccount(userId)
        const receiver = await getUserAccount(receiver_id)
        const chatCheck = canUsersChat(sender, receiver)
        if (!chatCheck.allowed) { if (callback) callback({ success: false, error: chatCheck.message }); return }
        const msgType = type || 'text'
        const { rows: insertRows } = await pool.query(
          'INSERT INTO messages (sender_id, receiver_id, product_id, content, type, file_url, file_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
          [userId, receiver_id, product_id || null, content?.trim() || null, msgType, file_url || null, file_name || null]
        )
        const { rows: msgs } = await pool.query(
          'SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1',
          [insertRows[0].id]
        )
        const message = msgs[0]
        io.to(`user_${receiver_id}`).emit('new_message', message)
        if (callback) callback({ success: true, message })
        const { rows: countRows } = await pool.query('SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false', [receiver_id])
        io.to(`user_${receiver_id}`).emit('message_count', { count: parseInt(countRows[0].count) })
      } catch (err) {
        console.error('[socket send_message error]', err)
        if (callback) callback({ success: false, error: err.message })
      }
    })

    socket.on('typing', ({ receiver_id }) => { io.to(`user_${receiver_id}`).emit('user_typing', { userId }) })
    socket.on('stop_typing', ({ receiver_id }) => { io.to(`user_${receiver_id}`).emit('user_stop_typing', { userId }) })

    socket.on('mark_read', async ({ sender_id }) => {
      try {
        await pool.query('UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false', [sender_id, userId])
        io.to(`user_${sender_id}`).emit('messages_read', { reader_id: userId })
      } catch (err) {
        console.error('[socket mark_read error]', err)
      }
    })

    socket.on('disconnect', () => {
      socket.broadcast.emit('user_offline', { userId })
      console.log(`🔌 Socket disconnected: user ${userId}`)
    })
  })

  return io
}

function getIO() { return io }

module.exports = { initSocket, getIO }
