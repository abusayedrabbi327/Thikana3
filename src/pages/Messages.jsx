import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
 ArrowLeft, Send, MessageSquare, Search, ShieldCheck,
 Paperclip, Smile, Mic, X, Image as ImageIcon, FileText,
 Phone, MoreVertical, Check, CheckCheck, AlertTriangle,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { getConversations, getMessageHistory, markConversationRead as apiMarkRead, sendMsg, uploadChatFile } from '../services/api'

/* ─── Emoji Grid ─── */
const EMOJI_LIST = [
 '😀','😃','😄','😁','😅','😂','🤣','😊','😇','🥰','😍','🤩','😘','😗',
 '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑',
 '😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒',
 '🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐',
 '👍','👎','👊','✊','🤛','🤜','🤝','👏','🙌','👐','🤲','🤞','✌️','🤟',
 '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','💢','💥','💫','💦','💨',
 '🏠','🏡','🏢','🏘️','🏗️','🔑','🛋️','🪑','🛏️','🚿','🧹','📦','🏷️','💰',
]

const formatTime = (d) => {
 const date = new Date(d)
 const now = new Date()
 const diff = now - date
 if (diff < 60000) return 'just now'
 if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
 if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
 if (diff < 604800000) return date.toLocaleDateString('en-US', { weekday: 'short' })
 return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatFullTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const formatDate = (d) => {
 const date = new Date(d)
 const now = new Date()
 const diff = now - date
 if (diff < 86400000) return 'Today'
 if (diff < 172800000) return 'Yesterday'
 return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Messages() {
 const navigate = useNavigate()
 const { user } = useAuth()
 const { socket, connected, onlineUsers, sendMessage: socketSend, emitTyping, emitStopTyping, markRead: socketMarkRead, setUnreadMsgCount, refreshMsgCount } = useSocket()
 const [searchParams] = useSearchParams()

 // State
 const [conversations, setConversations] = useState([])
 const [searchQuery, setSearchQuery] = useState('')
 const [activePartnerId, setActivePartnerId] = useState(null)
 const [messages, setMessages] = useState([])
 const [partner, setPartner] = useState(null)
 const [newMsg, setNewMsg] = useState('')
 const [sending, setSending] = useState(false)
 const [loadingConvos, setLoadingConvos] = useState(true)
 const [loadingMsgs, setLoadingMsgs] = useState(false)
 const [typingUser, setTypingUser] = useState(null)
 const [mobileShowChat, setMobileShowChat] = useState(false)
 const [showEmoji, setShowEmoji] = useState(false)
 const [showAttach, setShowAttach] = useState(false)
 const [showProfile, setShowProfile] = useState(false)
 const [recording, setRecording] = useState(false)
 const [recordingTime, setRecordingTime] = useState(0)
 const [uploading, setUploading] = useState(false)

 const msgsEndRef = useRef(null)
 const typingTimeoutRef = useRef(null)
 const inputRef = useRef(null)
 const fileInputRef = useRef(null)
 const imgInputRef = useRef(null)
 const mediaRecorderRef = useRef(null)
 const audioChunksRef = useRef([])
 const recordingIntervalRef = useRef(null)
 const emojiRef = useRef(null)

 // Auth guard
 useEffect(() => {
  if (!user) { navigate('/login'); return }
  if (user.is_admin || !['buyer', 'seller'].includes(user.role)) { navigate('/'); return }
  if (!user.nid_verified) { navigate('/verify-nid') }
 }, [user, navigate])

 // Load conversations
 const loadConversations = useCallback(async () => {
  try {
   const data = await getConversations()
   setConversations(data.conversations || [])
  } catch (err) { console.error(err) }
  finally { setLoadingConvos(false) }
 }, [])

 useEffect(() => { loadConversations() }, [loadConversations])

 const filteredConvos = useMemo(() => {
  if (!searchQuery.trim()) return conversations
  const q = searchQuery.toLowerCase()
  return conversations.filter(c =>
   c.partner_name?.toLowerCase().includes(q) || c.last_message?.toLowerCase().includes(q)
  )
 }, [searchQuery, conversations])

 // URL param: auto-open chat
 useEffect(() => {
  const userId = searchParams.get('user')
  if (userId && !activePartnerId) { setActivePartnerId(parseInt(userId)); setMobileShowChat(true) }
 }, [searchParams, activePartnerId])

 // Load messages when partner changes
 const loadMessages = useCallback(async (partnerId) => {
  if (!partnerId) return
  setLoadingMsgs(true)
  try {
   const productId = searchParams.get('product')
   const data = await getMessageHistory(partnerId, productId ? { product_id: productId } : {})
   setMessages(data.messages || [])
   setPartner(data.partner || null)
   apiMarkRead(partnerId).catch(() => {})
   socketMarkRead(partnerId)
   refreshMsgCount()
  } catch (err) { console.error(err) }
  finally { setLoadingMsgs(false) }
 }, [searchParams, socketMarkRead, refreshMsgCount])

 useEffect(() => { if (activePartnerId) loadMessages(activePartnerId) }, [activePartnerId, loadMessages])

 // Auto-scroll
 useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

 // Socket: new messages
 useEffect(() => {
  if (!socket) return
  const handler = (msg) => {
   if (msg.sender_id === activePartnerId || msg.receiver_id === activePartnerId) {
    setMessages(prev => [...prev, msg])
    if (msg.sender_id === activePartnerId) {
     socketMarkRead(activePartnerId)
     apiMarkRead(activePartnerId).catch(() => {})
     refreshMsgCount()
    }
   }
   loadConversations()
  }
  socket.on('new_message', handler)
  return () => socket.off('new_message', handler)
 }, [socket, activePartnerId, socketMarkRead, loadConversations, refreshMsgCount])

 // Socket: typing
 useEffect(() => {
  if (!socket) return
  const onType = ({ userId }) => { if (userId === activePartnerId) setTypingUser(userId) }
  const onStop = ({ userId }) => { if (userId === activePartnerId) setTypingUser(null) }
  const onRead = () => { setMessages(prev => prev.map(m => m.sender_id === user?.id ? { ...m, is_read: 1 } : m)) }
  socket.on('user_typing', onType)
  socket.on('user_stop_typing', onStop)
  socket.on('messages_read', onRead)
  return () => { socket.off('user_typing', onType); socket.off('user_stop_typing', onStop); socket.off('messages_read', onRead) }
 }, [socket, activePartnerId, user?.id])

 // Close emoji on outside click
 useEffect(() => {
  const handler = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false) }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
 }, [])

 // ── Send text message ──
 const handleSend = async (e) => {
  e.preventDefault()
  if (!newMsg.trim() || !activePartnerId) return
  setSending(true)
  setShowEmoji(false)
  try {
   const productId = searchParams.get('product')
   const res = await socketSend({
    receiver_id: activePartnerId, content: newMsg.trim(), type: 'text',
    product_id: productId ? parseInt(productId) : undefined,
   })
   if (res?.message) setMessages(prev => [...prev, res.message])
   setNewMsg('')
   emitStopTyping(activePartnerId)
  } catch {
   // Socket fallback → REST API
   try {
    const res = await sendMsg({ receiver_id: activePartnerId, content: newMsg.trim() })
    if (res?.message) setMessages(prev => [...prev, res.message])
    setNewMsg('')
   } catch (err) { console.error(err) }
  } finally { setSending(false) }
 }

 // ── Upload file/image ──
 const handleFileUpload = async (file, type) => {
  if (!file || !activePartnerId) return
  setUploading(true)
  setShowAttach(false)
  try {
   const uploadData = await uploadChatFile(type, file)

   const res = await socketSend({
    receiver_id: activePartnerId, type,
    file_url: uploadData.file_url, file_name: uploadData.file_name,
    content: type === 'image' ? '📷 Image' : `📎 ${uploadData.file_name}`,
   })
   if (res?.message) setMessages(prev => [...prev, res.message])
  } catch (err) { console.error('Upload error:', err) }
  finally { setUploading(false) }
 }

 // ── Voice recording ──
 const startRecording = async () => {
  try {
   const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
   const recorder = new MediaRecorder(stream)
   audioChunksRef.current = []
   recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
   recorder.onstop = async () => {
    stream.getTracks().forEach(t => t.stop())
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
    await handleFileUpload(file, 'voice')
   }
   recorder.start()
   mediaRecorderRef.current = recorder
   setRecording(true)
   setRecordingTime(0)
   recordingIntervalRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
  } catch (err) { console.error('Microphone error:', err) }
 }

 const stopRecording = () => {
  if (mediaRecorderRef.current?.state === 'recording') {
   mediaRecorderRef.current.stop()
  }
  setRecording(false)
  clearInterval(recordingIntervalRef.current)
 }

 const cancelRecording = () => {
  if (mediaRecorderRef.current?.state === 'recording') {
   mediaRecorderRef.current.ondataavailable = null
   mediaRecorderRef.current.onstop = null
   mediaRecorderRef.current.stop()
   mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop())
  }
  setRecording(false)
  setRecordingTime(0)
  clearInterval(recordingIntervalRef.current)
 }

 // ── Typing ──
 const handleTyping = (e) => {
  setNewMsg(e.target.value)
  if (activePartnerId) {
   emitTyping(activePartnerId)
   clearTimeout(typingTimeoutRef.current)
   typingTimeoutRef.current = setTimeout(() => emitStopTyping(activePartnerId), 2000)
  }
 }

 const selectConversation = (partnerId) => {
  setActivePartnerId(partnerId)
  setMobileShowChat(true)
  setShowProfile(false)
  setConversations(prev => prev.map(c => c.partner_id === partnerId ? { ...c, unread_count: 0 } : c))
 }

 // Group messages by date
 const groupedMessages = messages.reduce((acc, msg) => {
  const dateKey = formatDate(msg.created_at)
  if (!acc.length || acc[acc.length - 1].date !== dateKey) {
   acc.push({ date: dateKey, msgs: [msg] })
  } else {
   acc[acc.length - 1].msgs.push(msg)
  }
  return acc
 }, [])

 if (!user) return null

 return (
  <>
   <Navbar />
   <main className="h-screen pt-16 bg-theme-bg">
    <div className="h-full flex">

     {/* ══════════════ Conversation List ══════════════ */}
     <div className={`w-full md:w-[340px] lg:w-[380px] flex-shrink-0 border-r border-theme-border bg-theme-card flex flex-col
      ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
       <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-theme-text">Chatbox</h2>
        {connected && <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 text-[10px] font-semibold">Online</span>}
       </div>
       {/* Search */}
       <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
         placeholder="Search conversations..."
         className="w-full bg-theme-bg dark:bg-gray-800 border border-theme-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-theme-text placeholder-gray-400 focus:outline-none focus:border-theme-primary/50 transition-colors" />
       </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
       {loadingConvos ? (
        <div className="flex justify-center py-12">
         <div className="w-7 h-7 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
        </div>
       ) : filteredConvos.length === 0 ? (
        <div className="text-center py-16 px-6">
         <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
         <p className="text-sm text-theme-muted font-medium">{searchQuery ? 'No results found' : 'No conversations yet'}</p>
         <p className="text-xs text-theme-muted mt-1">Start chatting from a product page!</p>
        </div>
       ) : filteredConvos.map(conv => {
        const isActive = activePartnerId === conv.partner_id
        const isOnline = onlineUsers.has(conv.partner_id)
        return (
         <button key={conv.partner_id} onClick={() => selectConversation(conv.partner_id)}
          className={`w-full flex items-center gap-3 px-5 py-3.5 transition-all border-l-3
           ${isActive
            ? 'bg-theme-primary/10 dark:bg-orange-950/20 border-l-orange-500'
            : 'border-l-transparent hover:bg-theme-bg dark:hover:bg-gray-800/50'
           }`}>
          {/* Avatar */}
          <div className="relative flex-shrink-0">
           <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden shadow-sm">
            {conv.partner_avatar
             ? <img src={conv.partner_avatar} alt="" className="w-full h-full object-cover" />
             : conv.partner_name?.charAt(0)?.toUpperCase()
            }
           </div>
           {isOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
           )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
           <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-theme-text truncate flex items-center gap-1.5">
             {conv.partner_name}
             {conv.partner_verified === 1 && <ShieldCheck size={12} className="text-emerald-500 flex-shrink-0" />}
            </span>
            <span className="text-[10px] text-theme-muted flex-shrink-0 ml-2">{formatTime(conv.last_message_at)}</span>
           </div>
           <div className="flex items-center justify-between mt-0.5">
            <p className={`text-xs truncate pr-2 ${conv.unread_count > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-theme-muted'}`}>
             {isOnline && typingUser === conv.partner_id
              ? <span className="text-theme-primary font-medium italic">Typing...</span>
              : conv.last_message
             }
            </p>
            {conv.unread_count > 0 && (
             <span className="flex-shrink-0 min-w-[20px] h-5 bg-theme-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
              {conv.unread_count > 9 ? '9+' : conv.unread_count}
             </span>
            )}
           </div>
           {conv.product_title && (
            <p className="text-[10px] text-theme-primary/80 font-medium mt-0.5 truncate">Re: {conv.product_title}</p>
           )}
          </div>
         </button>
        )
       })}
      </div>
     </div>

     {/* ══════════════ Chat Area ══════════════ */}
     <div className={`flex-1 flex flex-col bg-theme-bg min-w-0
      ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>

      {!activePartnerId ? (
       <div className="flex-1 flex flex-col items-center justify-center text-theme-muted">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
         <MessageSquare size={36} className="text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-base font-medium text-theme-muted">Select a conversation</p>
        <p className="text-sm mt-1 text-theme-muted">or start a new one from a product page</p>
       </div>
      ) : (
       <>
        {/* ── Chat Header ── */}
        <div className="px-4 py-3 border-b border-theme-border flex items-center gap-3 shadow-sm" style={{ background: 'rgb(var(--theme-card) / 0.7)', backdropFilter: 'blur(12px)' }}>
         <button onClick={() => setMobileShowChat(false)} className="md:hidden p-1.5 rounded-lg text-theme-muted hover:text-theme-primary transition-colors">
          <ArrowLeft size={18} />
         </button>
         <button onClick={() => setShowProfile(v => !v)} className="flex items-center gap-3 flex-1 min-w-0 hover:bg-theme-bg dark:hover:bg-gray-800/50 -ml-1 px-2 py-1 rounded-xl transition-colors">
          <div className="relative flex-shrink-0">
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm">
            {partner?.avatar_url
             ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
             : partner?.full_name?.charAt(0)?.toUpperCase() || '?'
            }
           </div>
           {onlineUsers.has(activePartnerId) && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
           )}
          </div>
          <div className="min-w-0">
           <h3 className="font-semibold text-sm text-theme-text truncate flex items-center gap-1">
            {partner?.full_name || 'Loading…'}
            {partner?.nid_verified && <ShieldCheck size={12} className="text-emerald-500" />}
           </h3>
           <p className="text-[11px] mt-0.5 flex items-center gap-1.5">
            {typingUser === activePartnerId
             ? <span className="text-theme-primary font-medium inline-flex items-center gap-0.5">typing<span className="animate-pulse">...</span></span>
             : onlineUsers.has(activePartnerId)
              ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /><span className="text-emerald-500 font-medium">Online</span></>
              : <><span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" /><span className="text-theme-muted">Offline</span></>
            }
           </p>
          </div>
         </button>
         <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl text-theme-muted hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" title="Voice Call">
           <Phone size={17} />
          </button>
          <button onClick={() => setShowProfile(v => !v)} className={`p-2 rounded-xl transition-all ${showProfile ? 'text-theme-primary bg-theme-primary/10 dark:bg-orange-950/30' : 'text-theme-muted hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
           <MoreVertical size={17} />
          </button>
         </div>
        </div>

        {/* ── Content Row ── */}
        <div className="flex-1 flex min-h-0">
         {/* Messages Stream */}
         <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
           {loadingMsgs ? (
            <div className="flex justify-center py-16">
             <div className="w-7 h-7 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
            </div>
           ) : messages.length === 0 ? (
            <div className="text-center py-20">
             <p className="text-sm text-theme-muted">No messages yet. Say hi! 👋</p>
            </div>
           ) : groupedMessages.map((group, gi) => (
            <div key={gi}>
             {/* Date separator */}
             <div className="flex items-center justify-center my-5">
              <span className="text-[10px] font-semibold text-theme-muted bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase tracking-wider">
               {group.date}
              </span>
             </div>
             {/* Messages */}
             {group.msgs.map(msg => {
              const isMine = msg.sender_id === user.id
              return (
               <div key={msg.id} className={`flex mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {/* Partner avatar (left side) */}
                {!isMine && (
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0 mr-2 mt-auto">
                  {partner?.avatar_url
                   ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                   : partner?.full_name?.charAt(0)?.toUpperCase()
                  }
                 </div>
                )}
                <div className={`max-w-[70%] sm:max-w-[60%]`}>
                 {/* Image message */}
                 {msg.type === 'image' && msg.file_url && (
                  <div className={`rounded-2xl overflow-hidden shadow-sm mb-1 ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                   <a href={msg.file_url} target="_blank" rel="noreferrer">
                    <img src={msg.file_url} alt="Shared image" className="max-w-full max-h-64 object-cover rounded-2xl" />
                   </a>
                   {msg.content && msg.content !== '📷 Image' && (
                    <div className={`px-3 py-1.5 text-sm ${isMine ? 'bg-theme-primary text-white' : 'bg-white dark:bg-gray-800 text-theme-text'}`}>
                     {msg.content}
                    </div>
                   )}
                  </div>
                 )}
                 {/* Voice message */}
                 {msg.type === 'voice' && msg.file_url && (
                  <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
                   isMine ? 'bg-theme-primary text-white rounded-br-md' : 'bg-white dark:bg-gray-800 text-theme-text border border-theme-border rounded-bl-md'
                  }`}>
                   <audio src={msg.file_url} controls className="h-8 max-w-[200px]" />
                  </div>
                 )}
                 {/* File message */}
                 {msg.type === 'file' && msg.file_url && (
                  <a href={msg.file_url} target="_blank" rel="noreferrer"
                   className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
                    isMine ? 'bg-theme-primary text-white rounded-br-md' : 'bg-white dark:bg-gray-800 text-theme-text border border-theme-border rounded-bl-md'
                   }`}>
                   <FileText size={20} className={isMine ? 'text-orange-200' : 'text-theme-primary'} />
                   <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{msg.file_name || 'File'}</p>
                    <p className={`text-[10px] ${isMine ? 'text-orange-200' : 'text-theme-muted'}`}>Click to download</p>
                   </div>
                  </a>
                 )}
                 {/* Text message */}
                 {(msg.type === 'text' || !msg.type) && (
                  <div className={`rounded-2xl px-4 py-2.5 ${
                   isMine
                    ? 'bg-theme-primary text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-800 text-theme-text border border-theme-border rounded-bl-md'
                  } shadow-sm`}>
                   <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  </div>
                 )}
                 {/* Timestamp + read receipt */}
                 <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'} ${isMine ? 'text-theme-muted' : 'text-theme-muted'}`}>
                  {formatFullTime(msg.created_at)}
                  {isMine && (
                   msg.is_read
                    ? <CheckCheck size={12} className="text-blue-500" />
                    : <Check size={12} className="text-theme-muted" />
                  )}
                 </p>
                </div>
               </div>
              )
             })}
            </div>
           ))}

           {/* Typing indicator */}
           {typingUser === activePartnerId && (
            <div className="flex items-center gap-2 mb-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
              {partner?.avatar_url
               ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
               : partner?.full_name?.charAt(0)?.toUpperCase()
              }
             </div>
             <div className="bg-white dark:bg-gray-800 border border-theme-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 bg-gray-400 rounded-full" style={{ animation: 'typingDot 0.8s cubic-bezier(0.16,1,0.3,1) infinite', animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full" style={{ animation: 'typingDot 0.8s cubic-bezier(0.16,1,0.3,1) infinite', animationDelay: '200ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full" style={{ animation: 'typingDot 0.8s cubic-bezier(0.16,1,0.3,1) infinite', animationDelay: '400ms' }} />
             </div>
            </div>
           )}
           <div ref={msgsEndRef} />
          </div>

          {/* ── Input Bar ── */}
          <div className="px-4 sm:px-6 py-3 border-t border-theme-border" style={{ background: 'rgb(var(--theme-card) / 0.7)', backdropFilter: 'blur(12px)' }}>
           {/* Recording UI */}
           {recording ? (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
             <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
             <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-1">
              Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
             </span>
             <button onClick={cancelRecording} className="p-2 rounded-lg text-theme-muted hover:text-red-500 transition-colors" title="Cancel">
              <X size={18} />
             </button>
             <button onClick={stopRecording} className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-colors" title="Send Voice">
              <Send size={16} />
             </button>
            </div>
           ) : (
            <form onSubmit={handleSend} className="flex items-end gap-2">
             {/* Attach button */}
             <div className="relative">
              <button type="button" onClick={() => { setShowAttach(v => !v); setShowEmoji(false) }}
               className={`p-2.5 rounded-xl transition-all ${showAttach ? 'text-theme-primary bg-theme-primary/10 dark:bg-orange-950/30' : 'text-theme-muted hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
               <Paperclip size={18} />
              </button>
              {showAttach && (
               <div className="absolute bottom-14 left-0 glass-panel shadow-xl p-2 animate-fade-in z-20 w-40">
                <button type="button" onClick={() => imgInputRef.current?.click()}
                 className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-theme-bg dark:hover:bg-gray-800 transition-colors font-medium">
                 <ImageIcon size={16} className="text-blue-500" /> Image
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                 className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-theme-bg dark:hover:bg-gray-800 transition-colors font-medium">
                 <FileText size={16} className="text-theme-primary" /> File
                </button>
               </div>
              )}
              <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
               onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0], 'image'); e.target.value = '' }} />
              <input ref={fileInputRef} type="file" className="hidden"
               onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0], 'file'); e.target.value = '' }} />
             </div>

             {/* Emoji button */}
             <div className="relative" ref={emojiRef}>
              <button type="button" onClick={() => { setShowEmoji(v => !v); setShowAttach(false) }}
               className={`p-2.5 rounded-xl transition-all ${showEmoji ? 'text-theme-primary bg-theme-primary/10 dark:bg-orange-950/30' : 'text-theme-muted hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
               <Smile size={18} />
              </button>
              {showEmoji && (
               <div className="absolute bottom-14 left-0 glass-panel shadow-xl p-3 animate-fade-in z-20 w-72">
                <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                 {EMOJI_LIST.map((emoji, i) => (
                  <button key={`emoji-${i}`} type="button" onClick={() => { setNewMsg(prev => prev + emoji) }}
                   className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-lg transition-colors">
                   {emoji}
                  </button>
                 ))}
                </div>
               </div>
              )}
             </div>

             {/* Text Input */}
             <input ref={inputRef} type="text" value={newMsg} onChange={handleTyping}
              placeholder="Type a message…"
              className="flex-1 bg-theme-bg dark:bg-gray-800 border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text placeholder-gray-400 focus:outline-none focus:border-theme-primary/50 focus:ring-1 focus:ring-orange-100 dark:focus:ring-orange-900/40 transition-all" />

             {/* Voice / Send */}
             {newMsg.trim() ? (
              <button type="submit" disabled={sending || uploading}
               className="w-10 h-10 bg-theme-primary text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 flex-shrink-0 shadow-sm">
               <Send size={16} />
              </button>
             ) : (
              <button type="button" onClick={startRecording} disabled={uploading}
               className="w-10 h-10 bg-gray-100 dark:bg-gray-800 text-theme-muted rounded-xl flex items-center justify-center hover:bg-theme-primary hover:text-white transition-all flex-shrink-0">
               <Mic size={18} />
              </button>
             )}
            </form>
           )}
           {uploading && (
            <div className="mt-2 flex items-center gap-2 text-xs text-theme-primary font-medium">
             <div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
             Uploading...
            </div>
           )}
          </div>
         </div>

         {showProfile && partner && (
          <div className="hidden lg:flex w-72 flex-shrink-0 border-l border-theme-border flex-col animate-fade-in overflow-y-auto" style={{ background: 'rgb(var(--theme-card) / 0.4)', backdropFilter: 'blur(20px)' }}>
           <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden mx-auto shadow-lg mb-4">
             {partner.avatar_url
              ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
              : partner.full_name?.charAt(0)?.toUpperCase()
             }
            </div>
            <h3 className="text-lg font-bold text-theme-text flex items-center justify-center gap-1.5">
             {partner.full_name}
             {partner.nid_verified && <ShieldCheck size={14} className="text-emerald-500" />}
            </h3>
            <p className="text-xs font-semibold uppercase tracking-wider mt-1.5 flex items-center justify-center gap-1.5">
             {onlineUsers.has(activePartnerId)
              ? <><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-emerald-500">Online Now</span></>
              : <><span className="w-2 h-2 rounded-full bg-gray-400" /><span className="text-theme-muted">Offline</span></>
             }
            </p>
           </div>

           <div className="px-5 space-y-1">
            <SidebarItem icon={<Phone size={16} />} label="Voice Call" />
           </div>

           <div className="px-5 mt-5">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
             <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Secure Chat</span>
             </div>
             <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">
              Messages are stored securely. Chat responsibly and report suspicious behavior.
             </p>
            </div>
           </div>

           <div className="mt-auto p-5 space-y-2.5">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors border border-amber-200 dark:border-amber-800">
             <AlertTriangle size={14} />
             Report This {user?.role === 'seller' ? 'Buyer' : 'Seller'}
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border border-red-200 dark:border-red-800">
             Block Contact
            </button>
           </div>
          </div>
         )}
        </div>
       </>
      )}
     </div>
    </div>
   </main>
  </>
 )
}

function SidebarItem({ icon, label, onClick }) {
 return (
  <button onClick={onClick}
   className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-theme-bg dark:hover:bg-gray-800 transition-colors font-medium">
   <span className="text-theme-muted">{icon}</span>
   {label}
  </button>
 )
}
