import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
 ArrowLeft, Bell, BellOff, ShoppingBag, MessageSquare, ShieldCheck,
 CheckCircle2, AlertTriangle, Info, Check, CheckCheck,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { getNotifications as fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api'

const TYPE_CONFIG = {
 order:       { icon: ShoppingBag,  color: 'bg-theme-primary/20 dark:bg-orange-950/40 text-theme-primary' },
 message:      { icon: MessageSquare, color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-500' },
 product_approved: { icon: CheckCircle2,  color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500' },
 product_rejected: { icon: AlertTriangle, color: 'bg-red-100 dark:bg-red-950/40 text-red-500' },
 inquiry:      { icon: MessageSquare, color: 'bg-purple-100 dark:bg-purple-950/40 text-purple-500' },
 system:      { icon: Info,      color: 'bg-gray-100 dark:bg-gray-800 text-theme-muted' },
}

const formatTime = (d) => {
 const date = new Date(d)
 const now = new Date()
 const diff = now - date
 if (diff < 60000) return 'just now'
 if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
 if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
 if (diff < 604800000) return date.toLocaleDateString('en-US', { weekday: 'short' })
 return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Notifications() {
 const navigate = useNavigate()
 const { user } = useAuth()
 const { refreshNotifications } = useNotifications()

 const [notifications, setNotifications] = useState([])
 const [loading, setLoading] = useState(true)
 const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })

 const loadNotifications = useCallback(async (page = 1) => {
  setLoading(true)
  try {
   const data = await fetchNotifications({ page, limit: 20 })
   setNotifications(data.notifications || [])
   setPagination(data.pagination || { total: 0, page: 1, pages: 1 })
  } catch (err) { console.error(err) }
  finally { setLoading(false) }
 }, [])

 useEffect(() => {
  if (!user) { navigate('/login'); return }
  loadNotifications()
 }, [user, navigate, loadNotifications])

 const handleMarkRead = async (notif) => {
  if (!notif.is_read) {
   try {
    await markNotificationRead(notif.id)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n))
    refreshNotifications()
   } catch { /* fail silently */ }
  }
  // Navigate if link exists
  if (notif.link) navigate(notif.link)
 }

 const handleMarkAllRead = async () => {
  try {
   await markAllNotificationsRead()
   setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
   refreshNotifications()
  } catch { /* fail silently */ }
 }

 const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications])

 return (
  <>
   <Navbar />
   <main className="min-h-screen bg-theme-bg pt-24 pb-16">
    <div className="max-w-2xl mx-auto px-4 sm:px-6 animate-fade-in">

     {/* Header */}
     <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
       <Link to="/" className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-white dark:hover:bg-gray-900 border border-transparent hover:border-theme-border dark:hover:border-gray-800 transition-all">
        <ArrowLeft size={18} />
       </Link>
       <h1 className="text-xl font-bold text-theme-text flex items-center gap-2">
        <Bell size={20} className="text-theme-primary" /> Notifications
       </h1>
       {unreadCount > 0 && (
        <span className="bg-theme-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
       )}
      </div>
      {unreadCount > 0 && (
       <button onClick={handleMarkAllRead}
        className="flex items-center gap-1.5 text-xs font-medium text-theme-primary hover:text-theme-primary-hover transition-colors px-3 py-1.5 rounded-lg hover:bg-theme-primary/10 dark:hover:bg-orange-950/30">
        <CheckCheck size={14} /> Mark all read
       </button>
      )}
     </div>

     {loading ? (
      <div className="flex justify-center py-16">
       <div className="w-8 h-8 border-3 border-theme-primary border-t-transparent rounded-full animate-spin" />
      </div>
     ) : notifications.length === 0 ? (
      <div className="text-center py-20 glass-panel">
       <BellOff size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
       <h3 className="text-lg font-bold text-theme-text mb-1">All caught up!</h3>
       <p className="text-theme-muted text-sm">You don't have any notifications yet.</p>
      </div>
     ) : (
      <div className="space-y-2">
       {notifications.map(notif => {
        const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
        const Icon = cfg.icon
        return (
         <button key={notif.id} onClick={() => handleMarkRead(notif)}
          className={`w-full flex items-start gap-3 p-4 rounded-2xl border transition-all duration-200 text-left
           ${notif.is_read
            ? 'glass-panel opacity-60'
            : 'glass-panel border-theme-primary/20 shadow-md hover:shadow-lg hover:border-theme-primary/40'
           }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
           <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
           <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold ${notif.is_read ? 'text-theme-muted' : 'text-theme-text'}`}>
             {notif.title}
            </p>
            <span className="text-[10px] text-theme-muted flex-shrink-0 mt-0.5">{formatTime(notif.created_at)}</span>
           </div>
           {notif.body && (
            <p className="text-xs text-theme-muted mt-0.5 line-clamp-2">{notif.body}</p>
           )}
          </div>
          {!notif.is_read && (
           <span className="w-2.5 h-2.5 bg-theme-primary rounded-full flex-shrink-0 mt-1.5" />
          )}
         </button>
        )
       })}
      </div>
     )}
    </div>
   </main>
   <Footer />
  </>
 )
}
