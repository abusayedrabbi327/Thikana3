import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Menu, X, ChevronDown, User, LogOut, Settings,
  ShoppingCart, Bell, ShieldCheck, Sun, Moon, MessageSquare, RefreshCcw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'
import { useNotifications } from '../context/NotificationContext'
import { useSocket } from '../context/SocketContext'
import { getNidStatus } from '../services/api'
import Logo from './Logo'

/* ─── Nav links ─── */
const NAV_LINKS = [
  { label: 'Home', href: '/', hash: false },
  { label: 'Buy Flats', href: '#house_sell', hash: true },
  { label: 'Rent Houses', href: '#house_rent', hash: true },
  { label: 'Furniture', href: '#furniture', hash: true },
  { label: 'Appliances', href: '#appliance', hash: true },
  { label: 'AI Assistant', href: '/chatbot', hash: false },
  { label: 'Compare', href: '/compare', hash: false },
]

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('')
}

const ROLE_COLORS = {
  buyer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  seller: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
}

export default function Navbar() {
  const { user, logout, appMode, toggleAppMode } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const { cartCount } = useCart()
  const { unreadCount } = useNotifications()
  const { unreadMsgCount } = useSocket()
  const navigate = useNavigate()

  const location = useLocation()
  const currentPath = location.pathname
  const currentHash = location.hash
  const isHome = currentPath === '/'

  const canUseSellerMode = user?.role === 'seller' && !user?.is_admin
  const canUseBuyerMode = user?.role === 'buyer' && !user?.is_admin
  const displayRole = user?.is_admin ? 'admin' : user?.role

  const currentLinks = appMode === 'selling' && canUseSellerMode
    ? [
      { label: 'Dashboard', href: '/profile', hash: false },
      { label: 'Upload Property', href: '/upload-product', hash: false }
    ]
    : NAV_LINKS

  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [nidSubmission, setNidSubmission] = useState(null)
  const profileRef = useRef(null)

  useEffect(() => {
    const fn = () => {
      const threshold = isHome ? window.innerHeight - 100 : 10
      setScrolled(window.scrollY > threshold)
    }
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [isHome])

  useEffect(() => {
    function handler(e) {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!user || user.nid_verified || user.is_admin) {
      setNidSubmission(null)
      return
    }

    getNidStatus()
      .then(data => setNidSubmission(data.submission || null))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user || user.nid_verified || user.is_admin) return
    const currentStatus = nidSubmission?.verification_status || nidSubmission?.status
    if (!currentStatus || !['pending', 'processing', 'review'].includes(currentStatus)) return

    const pollId = setInterval(() => {
      getNidStatus()
        .then(data => setNidSubmission(data.submission || null))
        .catch(() => {})
    }, 5000)

    return () => clearInterval(pollId)
  }, [user, nidSubmission?.status, nidSubmission?.verification_status])

  const handleLogout = () => { logout(); setProfileOpen(false); navigate('/') }

  const isSolid = scrolled || !isHome

  return (
    <header className={`fixed top-4 left-0 right-0 z-50 transition-all duration-300 pointer-events-none px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* ── Logo ─── */}
        <div className="pointer-events-auto">
          <Link to="/" className={`flex items-center gap-2.5 group rounded-full px-4 py-2 transition-colors ${isSolid ? 'liquid-glass-invert text-theme-text' : 'liquid-glass text-white'}`} aria-label="Thikana home">
            <Logo size={24} />
            <span className="text-sm font-extrabold tracking-tight">
              Thikana
            </span>
          </Link>
        </div>

        {/* ── Desktop Nav ─── */}
        <nav className={`hidden md:flex items-center gap-1 rounded-full px-1.5 py-1.5 pointer-events-auto transition-colors ${isSolid ? 'liquid-glass-invert' : 'liquid-glass'}`} aria-label="Main navigation">
          {currentLinks.map(({ label, href, hash }) => {
            const target = hash ? { pathname: '/', hash: href.slice(1) } : href
            const isActive = hash
              ? isHome && currentHash === href
              : currentPath === href && currentHash === ''

            return hash ? (
              <Link key={label} to={target}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200
        ${isActive ? (isSolid ? 'bg-black/10 dark:bg-white/10 text-theme-text' : 'bg-white/20 text-white') : (isSolid ? 'text-theme-text hover:bg-black/5 dark:hover:bg-white/5' : 'text-white/90 hover:bg-white/10 hover:text-white')}`}>
                {label}
              </Link>
            ) : (
              <Link key={label} to={target}
                onClick={() => {
                  if (href === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200
        ${isActive ? (isSolid ? 'bg-black/10 dark:bg-white/10 text-theme-text' : 'bg-white/20 text-white') : (isSolid ? 'text-theme-text hover:bg-black/5 dark:hover:bg-white/5' : 'text-white/90 hover:bg-white/10 hover:text-white')}`}>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* ── Right Actions ─── */}
        <div className={`flex items-center gap-2 pointer-events-auto rounded-full px-2 py-1.5 transition-colors ${isSolid ? 'liquid-glass-invert text-theme-text' : 'liquid-glass text-white'}`}>

          {/* Theme Toggle */}
          <button
            id="theme-toggle"
            onClick={(e) => toggleTheme(e)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`p-1.5 rounded-full transition-all duration-200 ${isSolid ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'hover:bg-white/10'}`}
          >
            {dark
              ? <Sun size={16} className="text-yellow-400" />
              : <Moon size={16} />
            }
          </button>

          {user && (
            <>
              {/* Messages */}
              {!user?.is_admin && user?.nid_verified && (
                <Link to="/messages" aria-label="Messages"
                  className={`hidden sm:flex p-1.5 rounded-full transition-all duration-200 relative ${isSolid ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'hover:bg-white/10'}`}>
                  <MessageSquare size={16} />
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-950">
                      {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart */}
              {appMode === 'buying' && canUseBuyerMode && (
                <Link to="/cart" aria-label="Cart"
                  className={`hidden sm:flex p-1.5 rounded-full transition-all duration-200 relative ${isSolid ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'hover:bg-white/10'}`}>
                  <ShoppingCart size={16} />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-theme-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-950">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Notifications */}
              <Link to="/notifications" aria-label="Notifications"
                className={`hidden sm:flex p-1.5 rounded-full transition-all duration-200 relative ${isSolid ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'hover:bg-white/10'}`}>
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-950">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </>
          )}

          {/* ── Auth ─── */}
          {user ? (
            <div ref={profileRef} className="relative">
              <button
                id="profile-menu-btn"
                onClick={() => setProfileOpen(v => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-transparent transition-all duration-200 ${isSolid ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'hover:bg-white/10'}`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600
        flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user.full_name)
                  )}
                </div>
                <span className="text-sm font-medium max-w-[80px] truncate hidden sm:block">
                  {user.full_name?.split(' ')[0]}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-200
        ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-68 dropdown-panel py-2 animate-scale-in !text-theme-text" role="menu" style={{ minWidth: '16.5rem' }}>
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-theme-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600
           flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-theme-primary/30">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(user.full_name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-theme-text text-sm truncate">
                          {user.full_name}
                        </p>
                        <p className="text-theme-muted text-xs truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize
            ${ROLE_COLORS[displayRole] || ROLE_COLORS.buyer}`}>
                        {displayRole}
                      </span>
                      {user.nid_verified
                        ? <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full"><ShieldCheck size={10} /> NID Verified</span>
                        : ['pending', 'processing', 'review'].includes(nidSubmission?.verification_status || nidSubmission?.status)
                          ? <span className="inline-flex items-center gap-1 text-[10px] bg-theme-primary/10 dark:bg-orange-950/40 text-theme-primary border border-theme-primary/30 dark:border-orange-800 px-2 py-0.5 rounded-full">NID Pending</span>
                          : (nidSubmission?.verification_status || nidSubmission?.status) === 'rejected'
                            ? <>
                                <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">NID Rejected</span>
                                <Link to="/verify-nid" onClick={() => setProfileOpen(false)} className="text-[10px] text-blue-500 hover:text-blue-600 font-medium hover:underline">Submit Again →</Link>
                              </>
                            : <Link to="/verify-nid" onClick={() => setProfileOpen(false)} className="text-[10px] text-blue-500 hover:text-blue-600 font-medium hover:underline">Verify NID →</Link>
                      }
                    </div>
                  </div>

                  <div className="py-1">
                    {!user?.is_admin && (
                      <DropItem icon={<User size={15} />} label="My Profile" onClick={() => { navigate('/profile'); setProfileOpen(false) }} />
                    )}
                    <DropItem icon={<Settings size={15} />} label="Settings" onClick={() => { navigate('/settings'); setProfileOpen(false) }} />
                    {canUseSellerMode && (
                      <DropItem icon={<RefreshCcw size={15} />} label={appMode === 'buying' ? 'Switch to Selling' : 'View as Buyer'} onClick={() => { toggleAppMode(); setProfileOpen(false) }} />
                    )}
                    {!!user?.is_admin && (
                      <DropItem icon={<ShieldCheck size={15} />} label="Admin Panel" onClick={() => { navigate('/admin'); setProfileOpen(false) }} />
                    )}
                  </div>

                  <div className="border-t border-theme-border pt-1">
                    <button id="logout-btn" onClick={handleLogout} role="menuitem"
                       className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500
            hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-medium">
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 ml-1">
              <Link to="/login"
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isSolid ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'hover:bg-white/10 text-white'}`}>
                Sign In
              </Link>
              <Link to="/signup" className={`transition-opacity font-semibold text-sm py-1.5 px-4 rounded-full ${isSolid ? 'bg-theme-text text-theme-bg dark:bg-white dark:text-black hover:opacity-90' : 'bg-white text-black hover:opacity-90'}`}>
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button id="mobile-menu-toggle" onClick={() => setMobileOpen(v => !v)}
            aria-expanded={mobileOpen} aria-label="Toggle menu"
            className={`md:hidden p-1.5 rounded-full transition-colors ${isSolid ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'hover:bg-white/10 text-white'}`}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ─── */}
      <div className={`md:hidden overflow-hidden transition-all duration-300
    border border-theme-border/60 rounded-2xl mt-2 mx-4
    ${mobileOpen ? 'max-h-[540px] opacity-100' : 'max-h-0 opacity-0'}`}
        style={mobileOpen ? { background: 'rgb(var(--theme-card) / 0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } : {}}>
        <div className="px-4 py-3 space-y-1">
          {currentLinks.map(({ label, href, hash }) => {
            const target = hash ? { pathname: '/', hash: href.slice(1) } : href
            const isActive = hash
              ? isHome && currentHash === href
              : currentPath === href && currentHash === ''

            return hash ? (
              <Link key={label} to={target} onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-xl font-medium text-sm transition-colors
         ${isActive ? 'text-theme-primary bg-theme-primary/10 dark:bg-orange-950/30' : 'text-theme-text hover:text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-orange-950/30'}`}>
                {label}
              </Link>
            ) : (
              <Link key={label} to={target} onClick={() => {
                setMobileOpen(false);
                if (href === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
                className={`block px-4 py-2.5 rounded-xl font-medium text-sm transition-colors
         ${isActive ? 'text-theme-primary bg-theme-primary/10 dark:bg-orange-950/30' : 'text-theme-text hover:text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-orange-950/30'}`}>
                {label}
              </Link>
            )
          })}

          {/* Mobile-only links for logged-in users */}
          {user && (
            <div className="space-y-1 pt-2 border-t border-theme-border">
              {!user?.is_admin && user?.nid_verified && (
                <Link to="/messages" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-xl font-medium text-sm text-theme-text hover:text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-orange-950/30">
                  Messages
                </Link>
              )}
              {appMode === 'buying' && canUseBuyerMode && (
                <Link to="/cart" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-xl font-medium text-sm text-theme-text hover:text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-orange-950/30">
                  Cart {cartCount > 0 && `(${cartCount})`}
                </Link>
              )}
              <Link to="/notifications" onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-xl font-medium text-sm text-theme-text hover:text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-orange-950/30">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </Link>
            </div>
          )}

          <div className="border-t border-theme-border pt-3 mt-2">
            {user ? (
              <div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600
          flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-theme-primary/30">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user.full_name)
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-theme-text text-sm">{user.full_name}</p>
                    <p className="text-theme-muted text-xs capitalize">{displayRole}</p>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500
          font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block text-center px-4 py-2.5 rounded-xl border
          border-theme-border text-gray-700 dark:text-gray-300
          font-medium text-sm hover:border-orange-300">
                  Sign In
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)}
                  className="btn-primary justify-center">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function DropItem({ icon, label, onClick }) {
  return (
    <button onClick={onClick} role="menuitem"
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl mx-1 my-0.5
    text-theme-text hover:bg-theme-primary/10 dark:hover:bg-orange-950/30
    hover:text-theme-primary transition-all duration-200" style={{ width: 'calc(100% - 0.5rem)' }}>
      <span className="text-theme-muted group-hover:text-theme-primary">{icon}</span>
      {label}
    </button>
  )
}
