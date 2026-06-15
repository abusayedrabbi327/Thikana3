import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getNotificationUnreadCount } from '../services/api'
import { useAuth } from './AuthContext'
import { useSocket } from './SocketContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
 const { user } = useAuth()
 const { socket } = useSocket()
 const [unreadCount, setUnreadCount] = useState(0)

 const refreshNotifications = useCallback(async () => {
  if (!user) { setUnreadCount(0); return }
  try {
   const data = await getNotificationUnreadCount()
   setUnreadCount(data.count || 0)
  } catch { /* fail silently */ }
 }, [user])

 // Poll every 30 seconds
 useEffect(() => {
  refreshNotifications()
  const interval = setInterval(refreshNotifications, 30000)
  return () => clearInterval(interval)
 }, [refreshNotifications])

 // Listen for real-time notification count updates
 useEffect(() => {
  if (!socket) return
  const handler = ({ count }) => setUnreadCount(count)
  socket.on('notification_count', handler)
  return () => socket.off('notification_count', handler)
 }, [socket])

 return (
  <NotificationContext.Provider value={{ unreadCount, refreshNotifications, setUnreadCount }}>
   {children}
  </NotificationContext.Provider>
 )
}

export function useNotifications() {
 const ctx = useContext(NotificationContext)
 if (!ctx) throw new Error('useNotifications must be inside <NotificationProvider>')
 return ctx
}
