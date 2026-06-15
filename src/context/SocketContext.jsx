import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { getAccessToken, getUnreadMessageCount, refreshSession } from '../services/api'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
 const { user } = useAuth()
 const socketRef = useRef(null)
 const [connected, setConnected] = useState(false)
 const [onlineUsers, setOnlineUsers] = useState(new Set())
 const [unreadMsgCount, setUnreadMsgCount] = useState(0)

 // Fetch initial unread message count
 const refreshMsgCount = useCallback(async () => {
  if (!user) { setUnreadMsgCount(0); return }
  try {
   const data = await getUnreadMessageCount()
   setUnreadMsgCount(data.count || 0)
  } catch { /* fail silently */ }
 }, [user])

 useEffect(() => {
  refreshMsgCount()
 }, [refreshMsgCount])

 useEffect(() => {
  if (!user) {
   if (socketRef.current) {
    socketRef.current.disconnect()
    socketRef.current = null
    setConnected(false)
    setOnlineUsers(new Set())
    setUnreadMsgCount(0)
   }
   return
  }

  const token = getAccessToken()
  if (!token) return

  const socket = io(window.location.origin, {
   auth: { token },
   transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
   setConnected(true)
   console.log('🔌 Socket connected')
  })

  socket.on('disconnect', () => {
   setConnected(false)
   console.log('🔌 Socket disconnected')
  })

  socket.on('connect_error', async (err) => {
   if (err.message !== 'Invalid token' && err.message !== 'Authentication required') return
   try {
    const data = await refreshSession()
    socket.auth = { token: data.token }
    socket.connect()
   } catch {
    setConnected(false)
   }
  })

  socket.on('user_online', ({ userId }) => {
   setOnlineUsers(prev => new Set([...prev, userId]))
  })

  socket.on('user_offline', ({ userId }) => {
   setOnlineUsers(prev => {
    const next = new Set(prev)
    next.delete(userId)
    return next
   })
  })

  // Listen for unread message count updates from server (authoritative)
  socket.on('message_count', ({ count }) => {
   setUnreadMsgCount(count)
  })

  socketRef.current = socket

  return () => {
   socket.disconnect()
   socketRef.current = null
  }
 }, [user])

 const sendMessage = useCallback((data) => {
  return new Promise((resolve, reject) => {
   if (!socketRef.current) return reject(new Error('Not connected'))
   socketRef.current.emit('send_message', data, (response) => {
    if (response?.success) resolve(response)
    else reject(new Error(response?.error || 'Failed to send'))
   })
  })
 }, [])

 const emitTyping = useCallback((receiverId) => {
  socketRef.current?.emit('typing', { receiver_id: receiverId })
 }, [])

 const emitStopTyping = useCallback((receiverId) => {
  socketRef.current?.emit('stop_typing', { receiver_id: receiverId })
 }, [])

 const markRead = useCallback((senderId) => {
  socketRef.current?.emit('mark_read', { sender_id: senderId })
 }, [])

 return (
  <SocketContext.Provider value={{
   socket: socketRef.current,
   connected,
   onlineUsers,
   unreadMsgCount,
   setUnreadMsgCount,
   refreshMsgCount,
   sendMessage,
   emitTyping,
   emitStopTyping,
   markRead,
  }}>
   {children}
  </SocketContext.Provider>
 )
}

export function useSocket() {
 const ctx = useContext(SocketContext)
 if (!ctx) throw new Error('useSocket must be inside <SocketProvider>')
 return ctx
}
