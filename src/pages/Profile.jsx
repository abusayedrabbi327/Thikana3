import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
 ArrowLeft, Pencil, ShieldCheck, CalendarDays, ChevronRight,
 ShoppingBag, Heart, Star, Award,
 DollarSign, BarChart3, ClipboardList,
 Package, Plus,
 Bookmark, MapPin, Bell,
 Settings, LogOut, X, User, Phone, Home as HomeIcon,
 FileText, Camera, RefreshCw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
 import { getProfile, updateProfile, uploadAvatar, getNidStatus, getProducts, editProduct, getFavourites, getMyOrders, getSellerOrders, addReview, updateOrderStatus } from '../services/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

/* â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function getInitials(name = '') {
 return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('')
}

function formatDate(dateStr) {
 if (!dateStr) return 'N/A'
 return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/* â”€â”€ Role config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ROLE_BADGE = {
 buyer: { label: 'Verified Buyer', cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-800' },
 seller: { label: 'Verified Seller', cls: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 border-purple-200 dark:border-purple-800' },
 admin: { label: 'Platform Admin', cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800' },
}

const AVATAR_GRADIENT = {
 buyer: 'from-blue-400 to-indigo-600',
 seller: 'from-purple-400 to-fuchsia-600',
 admin: 'from-rose-400 to-pink-600',
}

const STATUS_BADGE = {
 pending:   'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800',
 confirmed:  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800',
 shipped:   'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800',
 delivered:  'bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200 dark:border-purple-800',
 cancelled:  'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800',
}

const PRICE_FORMATTER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/* â”€â”€ Mock stats (Removed - Generated Dynamically) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* â”€â”€ Buyer menu items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const BUYER_MENU = [
 { icon: ShoppingBag, label: 'My Orders' },
 { icon: Bookmark, label: 'Saved Listings' },
 { icon: Bell,    label: 'Notifications' },
 { icon: Settings, label: 'Settings' },
]

const BUYER_CANCEL_REASONS = [
 { value: 'changed_mind', label: 'Changed my mind' },
 { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
 { value: 'found_better_option', label: 'Found a better option' },
 { value: 'delivery_taking_too_long', label: 'Delivery is taking too long' },
 { value: 'payment_or_budget_issue', label: 'Payment or budget issue' },
 { value: 'others', label: 'Others' },
]


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  PROFILE PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function Profile() {
 const navigate = useNavigate()
 const [searchParams] = useSearchParams()
 const { user, logout, refreshUser, loading: authLoading } = useAuth()

 const [profile, setProfile]    = useState(null)
 const [nidSubmission, setNidSubmission] = useState(null)
 const [loading, setLoading]    = useState(true)
 const [activeSellerSection, setActiveSellerSection]  = useState(null)
 const [buyerView, setBuyerView]  = useState('menu')

 const [products,  setProducts]  = useState([])
 const [favourites, setFavourites] = useState([])

 const roleBadge = useMemo(() => ROLE_BADGE[profile?.role] || ROLE_BADGE.buyer, [profile?.role])
 const avatarGrad = useMemo(() => AVATAR_GRADIENT[profile?.role] || AVATAR_GRADIENT.buyer, [profile?.role])

 const formatPrice = (p) => PRICE_FORMATTER.format(p)

 const buyerStats = useMemo(() => ([
  { icon: ShoppingBag, value: profile?.stats?.orders || 0,  label: 'Orders',  color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40', action: 'orders' },
  { icon: Heart,    value: profile?.stats?.favorites || 0, label: 'Favorites', color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40', action: 'saved' },
  { icon: Star,    value: profile?.stats?.reviews || 0,  label: 'Reviews',  color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40', action: 'reviews' },
  { icon: Award,    value: profile?.stats?.points || 0,  label: 'Points',  color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40', action: null },
 ]), [profile])
 
 const sellerStats = useMemo(() => ([
  { icon: ShoppingBag, value: profile?.stats?.seller_orders || 0, label: 'Orders', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40', action: 'orders' },
  { icon: DollarSign,  value: `৳${formatPrice(profile?.stats?.total_sales || 0)}`, label: 'Total Sales', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40', action: null },
  { icon: BarChart3,   value: profile?.stats?.response_rate || '98%', label: 'Response Rate', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40', action: null },
  { icon: ClipboardList, value: profile?.stats?.active_listings || 0, label: 'My Listings', color: 'text-theme-primary bg-theme-primary/10 dark:bg-orange-950/40', action: 'products' },
 ]), [profile])

 /* â”€â”€ Fetch profile on mount â”€â”€ */
 useEffect(() => {
  if (authLoading) return
  if (!user) { navigate('/login'); return }
  if (user.is_admin) { navigate('/admin'); return }

  const isSeller = user.role === 'seller'
  const isBuyer = user.role === 'buyer'

  Promise.all([
   getProfile(),
   getNidStatus(),
   isSeller ? getProducts({ seller_id: user.id }).catch(() => ({ products: [] })) : Promise.resolve({ products: [] }),
   isBuyer ? getFavourites().catch(() => ({ favourites: [] })) : Promise.resolve({ favourites: [] }),
  ])
    .then(([profData, nidData, prodData, favData]) => {
    setProfile({ ...profData.user, stats: profData.stats || {} })
    setNidSubmission(nidData.submission)
    setProducts(prodData.products || [])
    setFavourites(favData.favourites || [])
   })
   .catch((err) => {
    console.error(err)
    // Only redirect to login on authentication errors (401).
    if (err && err.status === 401) navigate('/login')
   })
   .finally(() => setLoading(false))
 }, [user, navigate, authLoading])

 useEffect(() => {
  if (!profile) return
  const view = searchParams.get('view')
  if (profile.role === 'buyer' && view === 'orders') {
   setBuyerView('orders')
  }
 }, [profile, searchParams])

 // Poll for NID status updates while processing or pending admin review
 useEffect(() => {
  const currentStatus = nidSubmission?.verification_status || nidSubmission?.status
  if (!currentStatus || !['pending', 'processing', 'review'].includes(currentStatus)) return

  const pollInterval = setInterval(() => {
   getNidStatus()
    .then(data => setNidSubmission(data.submission || null))
    .catch(() => {})
  }, 5000) // Poll every 5 seconds

  return () => clearInterval(pollInterval)
 }, [nidSubmission?.status, nidSubmission?.verification_status])

 const fetchSellerProducts = () => {
  if (!user) return
  getProducts({ seller_id: user.id })
   .then(res => setProducts(res.products || []))
   .catch(console.error)
 }

 const handleLogout = () => { logout(); navigate('/') }

 const isSeller = profile?.role === 'seller'
 const nidStatus = nidSubmission?.verification_status || nidSubmission?.status
 const isNidProcessing = ['pending', 'processing', 'review'].includes(nidStatus)
 const isNidRejected = nidStatus === 'rejected'

 /* Profile skeleton loading state */
 if (authLoading || loading || !profile) {
  return (
   <>
    <Navbar />
    <div className="min-h-screen bg-theme-bg pt-16 pb-12 animate-fade-in">
     <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between py-5">
       <div className="flex items-center gap-3">
        <div className="skeleton-block h-9 w-9 rounded-lg" />
        <div className="skeleton-block h-6 w-28" />
       </div>
       <div className="skeleton-block h-9 w-24 rounded-lg" />
      </div>

      <div className="glass-card p-6 sm:p-8 mb-6">
       <div className="flex flex-col items-center text-center">
        <div className="skeleton-block h-24 w-24 rounded-full mb-4" />
        <div className="skeleton-block h-6 w-44 mb-2" />
        <div className="skeleton-block h-4 w-56 mb-3" />
        <div className="flex flex-wrap justify-center gap-2 mb-4">
         <div className="skeleton-block h-6 w-28 rounded-full" />
         <div className="skeleton-block h-6 w-36 rounded-full" />
         <div className="skeleton-block h-6 w-24 rounded-full" />
        </div>
        <div className="skeleton-block h-4 w-72 max-w-full" />
       </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
       {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="stat-card">
         <div className="skeleton-block h-10 w-10 rounded-xl mx-auto mb-2.5" />
         <div className="skeleton-block h-6 w-12 mx-auto mb-1.5" />
         <div className="skeleton-block h-3 w-20 mx-auto" />
        </div>
       ))}
      </div>

      <div className="space-y-3">
       {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="skeleton-block h-16 w-full rounded-xl" />
       ))}
      </div>
     </div>
    </div>
   </>
  )
 }

 return (
  <>
   <Navbar />
   <main className="min-h-screen bg-theme-bg pt-16 pb-12 transition-colors duration-200">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

     {/* â”€â”€ Page Header Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
     <div className="flex items-center justify-between py-5">
      <div className="flex items-center gap-3">
       <Link to="/"
        className="p-2 rounded-lg text-theme-muted hover:text-theme-primary
         hover:bg-white dark:hover:bg-gray-900 border border-transparent
         hover:border-theme-border dark:hover:border-gray-800 transition-all duration-200">
        <ArrowLeft size={18} />
       </Link>
       <h1 className="text-lg font-bold text-theme-text">My Profile</h1>
      </div>
      <Link to="/settings"
       className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
        text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-orange-950/30
        border border-theme-primary/30 dark:border-orange-800
        transition-all duration-200 active:scale-95">
       <Settings size={14} />
       Settings
      </Link>
     </div>

     {/* â”€â”€ Profile Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
     <div className="glass-card p-6 sm:p-8 mb-6 animate-slide-up">

      {/* Avatar + Info */}
      <div className="flex flex-col items-center text-center">
       <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatarGrad}
        flex items-center justify-center text-white text-3xl font-bold
        ring-4 ring-white dark:ring-gray-900 shadow-lg mb-4 overflow-hidden relative group`}>
        {profile.avatar_url ? (
         <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
        ) : (
         getInitials(profile.full_name)
        )}
       </div>

       <h2 className="text-xl font-bold text-theme-text">
        {profile.full_name}
       </h2>
       <p className="text-theme-muted text-sm mt-0.5">{profile.email}</p>

       {/* Badges */}
       <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
        {profile.is_verified ? (
         <span className={`inline-flex items-center gap-1.5 text-xs font-semibold
          px-3 py-1 rounded-full border ${roleBadge.cls}`}>
          <ShieldCheck size={12} /> {roleBadge.label}
         </span>
        ) : (
         <span className="inline-flex items-center gap-1.5 text-xs font-medium
          px-3 py-1 rounded-full border border-theme-border
          text-theme-muted bg-theme-bg dark:bg-gray-800 capitalize">
          {profile.role}
         </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs text-theme-muted
         bg-theme-bg dark:bg-gray-800 px-3 py-1 rounded-full border
         border-theme-border">
         <CalendarDays size={11} /> Member Since {formatDate(profile.created_at)}
        </span>
        
        {/* NID Badge/Button */}
        {profile.nid_verified ? (
         <span className="inline-flex items-center gap-1.5 text-xs font-semibold
          px-3 py-1 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800">
          <ShieldCheck size={12} /> NID Verified
         </span>
        ) : isNidProcessing ? (
         <span className="inline-flex items-center gap-1.5 text-xs font-medium
          px-3 py-1 rounded-full border bg-theme-primary/10 dark:bg-orange-950/20 text-theme-primary border-theme-primary/30 dark:border-orange-800/50">
          <span>{nidStatus === 'review' ? 'NID In Admin Review' : 'NID Pending Review'}</span>
          <RefreshCw size={12} className="animate-spin opacity-75" />
         </span>
        ) : isNidRejected ? (
         <>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold
           px-3 py-1 rounded-full border bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800">
           NID Rejected
          </span>
          <Link to="/verify-nid" className="inline-flex items-center gap-1 text-xs font-semibold
           px-3 py-1 rounded-full border bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
           Submit Again â†’
          </Link>
         </>
        ) : (
         <Link to="/verify-nid" className="inline-flex items-center gap-1 text-xs font-semibold
          px-3 py-1 rounded-full border bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
          Verify Identity â†’
         </Link>
        )}
       </div>

       {/* Bio */}
       {profile.bio && (
        <p className="text-theme-muted text-sm mt-4 max-w-md leading-relaxed">
         {profile.bio}
        </p>
       )}
      </div>
     </div>

     {/* â”€â”€ Stats Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
     <div className={`grid gap-3 mb-6 animate-slide-up ${
      isSeller ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'
     }`} style={{ animationDelay: '60ms' }}>
     {(isSeller ? sellerStats : buyerStats).map(({ icon: Icon, value, label, color, sub, action }) => (
      <button key={label} onClick={() => {
       if (!action) return
       if (isSeller) setActiveSellerSection(prev => prev === action ? null : action)
       if (!isSeller) setBuyerView(action)
      }}
       className={`stat-card group flex flex-col items-center justify-center ${action ? 'cursor-pointer hover:border-theme-primary transition-colors' : 'cursor-default'}`}>
        <div className={`w-10 h-10 rounded-xl ${color}
         flex items-center justify-center mx-auto mb-2.5
         group-hover:scale-110 transition-transform duration-300`}>
         <Icon size={18} />
        </div>
        <p className="text-xl font-bold text-theme-text">{value}</p>
        <p className="text-xs text-theme-muted mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-emerald-500 font-medium mt-1">{sub}</p>}
       </button>
      ))}
     </div>

     {/* â”€â”€ Role-specific Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
     {isSeller
      ? <SellerContent activeSection={activeSellerSection} setActiveSection={setActiveSellerSection} products={products} refreshProducts={fetchSellerProducts} highlightedOrderId={Number(searchParams.get('orderId')) || null} />
      : <BuyerContent onLogout={handleLogout} favourites={favourites} view={buyerView} setView={setBuyerView} highlightedOrderId={Number(searchParams.get('orderId')) || null} />}

    </div>
   </main>
   <Footer />
  </>
 )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  BUYER CONTENT â€” Menu list style
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function BuyerContent({ onLogout, favourites, view, setView, highlightedOrderId }) {
 const navigate = useNavigate()

 if (view === 'orders') {
  return <BuyerOrdersTab onBack={() => setView('menu')} highlightedOrderId={highlightedOrderId} />
 }

 if (view === 'saved') {
  return (
   <div className="space-y-3 animate-slide-up">
    <button onClick={() => setView('menu')} className="flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary transition-colors mb-2">
     <ArrowLeft size={14} /> Back
    </button>
    <h3 className="text-sm font-bold text-theme-text mb-3">Saved Listings</h3>
    {favourites.length === 0 ? (
     <div className="text-center py-10 text-theme-muted">
      <Heart size={32} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">No saved listings yet.</p>
     </div>
    ) : (
     <div className="grid grid-cols-2 gap-3">
      {favourites.map(f => (
       <Link key={f.id} to={`/product/${f.id}`} className="card p-3 group">
        <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 mb-2 overflow-hidden">
         {f.main_image
          ? <img src={f.main_image} alt={f.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          : <div className="w-full h-full flex items-center justify-center text-theme-muted"><Package size={20} /></div>
         }
        </div>
        <p className="text-xs font-semibold text-theme-text truncate">{f.title}</p>
        <p className="text-xs font-bold text-theme-primary mt-0.5">৳{Number(f.price).toLocaleString()}</p>
       </Link>
      ))}
     </div>
    )}
   </div>
  )
 }

 // All other views are handled via navigation, not menu list
 return null
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  SELLER CONTENT â€” Card-driven expandable sections
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function SellerContent({ activeSection, setActiveSection, products, refreshProducts, highlightedOrderId }) {
 const isOpen = (section) => activeSection === section

 return (
  <div className="space-y-4 animate-slide-up" style={{ animationDelay: '120ms' }}>
   <div className="flex items-center justify-between gap-3">
    <div>
     <h3 className="text-base font-bold text-theme-text">Quick Actions</h3>
     <p className="text-xs text-theme-muted mt-1">Click a card above to expand its section.</p>
    </div>
    <Link to="/upload-product" className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 focus:outline-none">
     <Plus size={14} /> Add New Product
    </Link>
   </div>

   <div className={`glass-panel transition-all duration-300 overflow-hidden ${isOpen('products') ? 'p-5' : 'p-0'}`}>
    {isOpen('products') && (
     <>
      <div className="flex items-center justify-between gap-3 mb-4">
       <div>
        <h4 className="text-sm font-bold text-theme-text">My Listings</h4>
        <p className="text-xs text-theme-muted mt-1">All of your approved and pending products.</p>
       </div>
       <button onClick={() => setActiveSection(null)} className="text-xs font-semibold text-theme-muted hover:text-theme-primary transition-colors">Collapse</button>
      </div>
      <ProductsTab products={products} refreshProducts={refreshProducts} />
     </>
    )}
   </div>

   <div className={`glass-panel transition-all duration-300 overflow-hidden ${isOpen('orders') ? 'p-5' : 'p-0'}`}>
    {isOpen('orders') && (
     <>
      <div className="flex items-center justify-between gap-3 mb-4">
       <div>
        <h4 className="text-sm font-bold text-theme-text">Orders</h4>
        <p className="text-xs text-theme-muted mt-1">Orders tied to your products.</p>
       </div>
       <button onClick={() => setActiveSection(null)} className="text-xs font-semibold text-theme-muted hover:text-theme-primary transition-colors">Collapse</button>
      </div>
      <SellerOrdersTab highlightedOrderId={highlightedOrderId} refreshProducts={refreshProducts} />
     </>
    )}
   </div>
  </div>
 )
}

function ProductsTab({ products, refreshProducts }) {
 const [editingProduct, setEditingProduct] = useState(null)

 return (
  <>
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {products.map(p => (
     <div key={p.id} className="card p-4 group relative">
      {/* Action Overlay */}
      <div className="absolute top-6 right-6 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditingProduct(p)} className="p-2 bg-white text-gray-700 hover:text-theme-primary rounded-full shadow-md">
         <Pencil size={14} />
        </button>
      </div>

      {/* Main Image */}
      <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3 flex items-center justify-center overflow-hidden relative
       transition-all duration-300">
       {p.main_image ? (
        <img src={p.main_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
       ) : (
        <Package size={28} className="text-gray-300 dark:text-gray-600
         group-hover:text-orange-300 dark:group-hover:text-orange-700 transition-colors" />
       )}
      </div>
      <div className="flex items-start justify-between gap-2">
       <div className="min-w-0 flex-1 pr-2">
        <Link to={`/product/${p.id}`} className="text-sm font-semibold text-theme-text truncate hover:text-theme-primary hover:underline block">{p.title}</Link>
        <p className="text-xs text-theme-muted mt-0.5 capitalize">{p.category.replaceAll('_', ' ')}</p>
       </div>
       <span className={`text-[10px] whitespace-nowrap font-bold px-2 py-0.5 rounded-full uppercase
        ${p.status === 'approved' || p.status === 'active'
         ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
         : p.status === 'pending'
         ? 'bg-theme-primary/10 dark:bg-orange-950/40 text-theme-primary border border-theme-primary/30 dark:border-orange-800'
         : p.status === 'sold'
         ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800'
         : 'bg-gray-100 dark:bg-gray-800 text-theme-muted border border-theme-border'}`}>
        {p.status}
       </span>
      </div>
      <p className="text-base font-bold text-theme-primary mt-2">৳{p.price.toLocaleString()}</p>
     </div>
    ))}

    {/* Add-new card */}
   <Link to="/upload-product" className="border-2 border-dashed border-theme-border
    rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[200px]
    text-theme-muted hover:border-orange-300 dark:hover:border-orange-700
    hover:text-theme-primary hover:bg-theme-primary/10/30 dark:hover:bg-orange-950/10
    transition-all duration-200 group">
    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800
     flex items-center justify-center group-hover:bg-theme-primary/20 dark:group-hover:bg-orange-950/30
     transition-colors">
     <Plus size={22} />
    </div>
    <p className="text-sm font-medium">Add New Item</p>
    <p className="text-xs text-gray-300 dark:text-gray-600">List your product here</p>
   </Link>
  </div>
   
   {editingProduct && (
    <EditProductModal 
     product={editingProduct} 
     onClose={() => setEditingProduct(null)} 
     onSuccess={() => { setEditingProduct(null); refreshProducts(); }} 
    />
   )}
  </>
 )
}

function PlaceholderTab({ label }) {
 return (
  <div className="flex flex-col items-center justify-center py-16 text-theme-muted">
   <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800
    flex items-center justify-center mb-3">
    <FileText size={24} />
   </div>
   <p className="text-sm font-medium">No {label.toLowerCase()} yet</p>
   <p className="text-xs mt-1">Your {label.toLowerCase()} will appear here</p>
  </div>
 )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  EDIT PROFILE MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function EditProfileModal({ profile, onClose, onSaved }) {
 const [form, setForm] = useState({
  fullName: profile.full_name || '',
  phone:  profile.phone || '',
  address: profile.address || '',
  bio:   profile.bio || '',
 })
 const [saving, setSaving]    = useState(false)
 const [error, setError]     = useState('')
 const [success, setSuccess]   = useState(false)
 const [avatarDataUrl, setAvatarDataUrl] = useState('')
 const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url || '')

 const handleChange = e => {
  const { name, value } = e.target
  setForm(p => ({ ...p, [name]: value }))
  if (error) setError('')
 }

 const handleAvatarChange = e => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
   setAvatarPreview(ev.target.result)
   setAvatarDataUrl(ev.target.result)
  }
  reader.readAsDataURL(file)
 }

 const handleSave = async e => {
  e.preventDefault()
  if (!form.fullName.trim() || form.fullName.length < 3) {
   setError('Name must be at least 3 characters.')
   return
  }
  setSaving(true)
  setError('')
  try {
   let finalUser = null;
   if (avatarDataUrl) {
    const { user } = await uploadAvatar(avatarDataUrl)
    finalUser = user;
   }
   
   const { user } = await updateProfile(form)
   finalUser = user; // latest update

   setSuccess(true)
   setTimeout(() => onSaved(finalUser), 600)
  } catch (err) {
   setError(err.message || 'Failed to update profile.')
  } finally {
   setSaving(false)
  }
 }

 return (
  <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
   onClick={onClose}>
   {/* Backdrop */}
   <div className="fixed inset-0 glass-overlay animate-fade-in" />

   {/* Modal */}
   <div className="glass-modal relative w-full max-w-lg
    animate-modal-in max-h-[90vh] overflow-y-auto"
    onClick={e => e.stopPropagation()}>

    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4
     border-b border-theme-border sticky top-0
     bg-theme-card z-10">
     <h3 className="text-lg font-bold text-theme-text">Edit Profile</h3>
     <button onClick={onClose}
      className="p-2 rounded-lg text-theme-muted hover:text-gray-600 dark:hover:text-gray-300
       hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <X size={18} />
     </button>
    </div>

    {/* Form */}
    <form onSubmit={handleSave} className="p-6 space-y-4">
     {error && (
      <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800
       rounded-xl text-red-600 text-sm text-center">
       {error}
      </div>
     )}
     {success && (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800
       rounded-xl text-emerald-600 text-sm text-center">
       âœ“ Profile updated successfully!
      </div>
     )}

     {/* Avatar Edit */}
     <div className="flex flex-col items-center justify-center py-2">
      <label className="relative cursor-pointer group block">
       <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${AVATAR_GRADIENT[profile.role] || AVATAR_GRADIENT.buyer}
        flex items-center justify-center text-white text-2xl font-bold
        overflow-hidden border-2 border-theme-border shadow-sm`}>
        {avatarPreview ? (
         <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
         getInitials(profile.full_name)
        )}
       </div>
       <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 
        transition-opacity flex items-center justify-center text-white">
        <Camera size={20} />
       </div>
       <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleAvatarChange} />
      </label>
      <p className="text-[10px] text-theme-muted mt-2">Click to change picture</p>
     </div>

     <ModalField icon={<User size={15} />} label="Full Name">
      <input name="fullName" value={form.fullName} onChange={handleChange}
       placeholder="Your full name" className="input-field pl-10" />
     </ModalField>

     <ModalField icon={<Phone size={15} />} label="Phone">
      <input name="phone" value={form.phone} onChange={handleChange}
       placeholder="e.g. 01712345678" className="input-field pl-10" />
     </ModalField>

     <ModalField icon={<MapPin size={15} />} label="Address">
      <input name="address" value={form.address} onChange={handleChange}
       placeholder="e.g. Banani, Dhaka" className="input-field pl-10" />
     </ModalField>

     <div>
      <label htmlFor="profile-input-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bio</label>
      <textarea id="profile-input-1" name="bio" value={form.bio} onChange={handleChange} rows={3}
       placeholder="Tell us about yourselfâ€¦"
       className="input-field resize-none" />
     </div>

     {/* Actions */}
     <div className="flex items-center justify-end gap-3 pt-2">
      <button type="button" onClick={onClose}
       className="px-5 py-2.5 rounded-lg text-sm font-medium
        text-theme-muted hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors">
       Cancel
      </button>
      <button type="submit" disabled={saving}
       className="btn-primary py-2.5 disabled:opacity-70 disabled:cursor-not-allowed">
       {saving
        ? <span className="flex items-center gap-2"><ModalSpinner /> Savingâ€¦</span>
        : 'Save Changes'}
      </button>
     </div>
    </form>
   </div>
  </div>
 )
}

function ModalField({ icon, label, children }) {
 return (
  <div>
   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
   <div className="relative">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none">
     {icon}
    </span>
    {children}
   </div>
  </div>
 )
}

function ModalSpinner() {
 return (
  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
 )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  EDIT PRODUCT MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function EditProductModal({ product, onClose, onSuccess }) {
 const [formData, setFormData] = useState({
  title: product.title || '',
  price: product.price || '',
  description: product.description || '',
  status: product.status || 'approved'
 })
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')

 const handleChange = (e) => {
  setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
 }

 const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)
  setError('')
  try {
   await editProduct(product.id, formData)
   onSuccess()
  } catch (err) {
   setError(err.message || 'Failed to update product.')
   setLoading(false)
  }
 }

 // Prevent scroll on body
 useEffect(() => {
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = 'auto' }
 }, [])

 return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden outline-none">
   <div className="fixed inset-0 glass-overlay animate-fade-in z-[-1]" onClick={onClose} />

   <div className="glass-modal w-full max-w-md max-h-full overflow-y-auto animate-slide-up relative z-10">
    
    {/* Header */}
    <div className="flex items-center justify-between p-5 border-b border-theme-border sticky top-0 bg-theme-card z-20">
     <h2 className="text-xl font-bold text-theme-text">Edit Product</h2>
     <button onClick={onClose} className="p-2 text-theme-muted hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
      <X size={20} />
     </button>
    </div>

    {/* Body */}
    <div className="p-5">
     {error && (
      <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
       {error}
      </div>
     )}

     <form id="edit-prod-form" onSubmit={handleSubmit} className="space-y-4">
      <div>
       <label htmlFor="profile-input-2" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
       <input id="profile-input-2" type="text" name="title" value={formData.title} onChange={handleChange} required
        className="input-field py-2" />
      </div>

      <div>
       <label htmlFor="profile-input-3" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Price (BDT)</label>
       <input id="profile-input-3" type="number" name="price" value={formData.price} onChange={handleChange} required
        className="input-field py-2" />
      </div>

      <div>
       <label htmlFor="profile-input-4" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
       <select id="profile-input-4" name="status" value={formData.status} onChange={handleChange}
        className="input-field py-2">
        <option value="approved">Active</option>
        <option value="sold">Mark as Sold Out</option>
        <option value="pending">Hide (Pending Review)</option>
       </select>
      </div>

      <div>
       <label htmlFor="profile-input-5" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
       <textarea id="profile-input-5" name="description" value={formData.description} onChange={handleChange} rows="4"
        className="input-field py-2 min-h-[100px] resize-y" />
      </div>
     </form>
    </div>

    {/* Footer */}
    <div className="p-5 border-t border-theme-border flex gap-3 justify-end bg-theme-bg bg-theme-card/50 rounded-b-3xl">
     <button type="button" onClick={onClose}
      className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
      Cancel
     </button>
     <button type="submit" form="edit-prod-form" disabled={loading}
      className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2">
      {loading ? <ModalSpinner /> : 'Save Changes'}
     </button>
    </div>
   </div>
  </div>
 )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  SELLER ORDERS TAB
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function SellerOrdersTab({ highlightedOrderId, refreshProducts }) {
 const [items, setItems] = useState([])
 const [loading, setLoading] = useState(true)
 const [updatingProductId, setUpdatingProductId] = useState(null)

 useEffect(() => {
  getSellerOrders()
   .then(res => setItems(res.orders || []))
   .catch(console.error)
   .finally(() => setLoading(false))
 }, [])

 const handleMarkAsSold = async (item) => {
  if (item.product_status === 'sold') return
  setUpdatingProductId(item.product_id)
  try {
   await editProduct(item.product_id, { status: 'sold' })
   setItems(prev => prev.map(it => it.product_id === item.product_id ? { ...it, product_status: 'sold' } : it))
   refreshProducts?.()
  } catch (err) {
   alert(err.message || 'Failed to mark product as sold.')
  } finally {
   setUpdatingProductId(null)
  }
 }

 const groupedOrders = Object.values(items.reduce((acc, item) => {
  if (!acc[item.order_id]) {
   acc[item.order_id] = {
    id: item.order_id,
    orderStatus: item.order_status,
    orderDate: item.order_date,
    buyerName: item.buyer_name,
    buyerEmail: item.buyer_email,
    buyerPhone: item.buyer_phone,
    shippingAddress: item.shipping_address,
    is_booking: item.is_booking,
    booking_amount: item.booking_amount,
    total: 0,
    items: []
   }
  }
  acc[item.order_id].items.push(item)
  acc[item.order_id].total += Number(item.price) * Number(item.quantity)
  return acc
 }, {}))

 if (loading) {
  return (
   <div className="py-10 text-center animate-pulse">
    <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto" />
   </div>
  )
 }

 if (groupedOrders.length === 0) {
  return (
   <div className="text-center py-10 bg-theme-card rounded-2xl border border-theme-border">
    <ShoppingBag size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
    <p className="text-sm font-medium text-theme-muted">No orders yet.</p>
   </div>
  )
 }

 return (
  <div className="space-y-4">
   {groupedOrders.map(order => (
    <div key={order.id} className={`bg-theme-card border rounded-2xl p-4 shadow-sm ${highlightedOrderId === order.id ? 'border-theme-primary ring-1 ring-theme-primary/30' : 'border-theme-border'}`}>
     <div className="flex items-center justify-between border-b border-theme-border pb-3 mb-3">
      <div>
       <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-theme-text">Order #{order.id}</p>
        {order.is_booking && (
         <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 uppercase tracking-tight">Booking</span>
        )}
       </div>
       <p className="text-[10px] text-theme-muted">{new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
      </div>
      <div className="text-right">
       <p className="text-sm font-bold text-rose-500">৳{order.total.toLocaleString()}</p>
       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${STATUS_BADGE[order.orderStatus] || 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
        {order.orderStatus}
       </span>
      </div>
     </div>
     <p className="text-[11px] text-theme-muted mb-3">
      Buyer: <span className="text-theme-text font-semibold">{order.buyerName}</span> Â· {order.buyerEmail} Â· {order.buyerPhone}
     </p>
     <p className="text-[11px] text-theme-muted mb-3">Shipping: {order.shippingAddress}</p>
     <div className="mb-3">
      <Link to={`/orders/${order.id}`} className="text-xs text-theme-primary font-semibold hover:underline">Open full order details â†’</Link>
     </div>
     <div className="space-y-3">
      {order.items.map(item => (
       <div key={item.id} className="flex items-center justify-between bg-theme-bg/50 p-2.5 rounded-xl gap-3">
        <div className="flex items-center gap-3 min-w-0">
         <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0">
          {item.main_image ? (
           <img src={item.main_image} alt={item.title} className="w-full h-full object-cover" />
          ) : <Package size={16} className="m-auto mt-2 text-theme-muted" />}
         </div>
         <div className="min-w-0">
          <Link to={`/product/${item.product_id}`} className="text-xs font-semibold text-theme-text hover:text-theme-primary truncate block max-w-[170px] sm:max-w-[230px]">
           {item.title}
          </Link>
          <p className="text-[10px] text-theme-muted mt-0.5">৳{Number(item.price).toLocaleString()} × {item.quantity}</p>
         </div>
        </div>
        {item.product_status === 'sold' ? (
         <span className="text-[10px] px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800 font-semibold">Sold</span>
        ) : (
         <button onClick={() => handleMarkAsSold(item)} disabled={updatingProductId === item.product_id}
          className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme-primary/30 transition-colors disabled:opacity-60">
          {updatingProductId === item.product_id ? 'Updating...' : 'Mark as Sold'}
         </button>
        )}
       </div>
      ))}
     </div>
    </div>
   ))}
  </div>
 )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  BUYER ORDERS TAB
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function BuyerOrdersTab({ onBack, highlightedOrderId }) {
 const [orders, setOrders] = useState([])
 const [loading, setLoading] = useState(true)
 const [reviewItem, setReviewItem] = useState(null)
 const [expandedOrderIds, setExpandedOrderIds] = useState([])
 const [updatingOrderId, setUpdatingOrderId] = useState(null)
 const [cancelOrderId, setCancelOrderId] = useState(null)
 const [cancelReason, setCancelReason] = useState('')
 const [cancelOtherReason, setCancelOtherReason] = useState('')
 const [cancelAgreement, setCancelAgreement] = useState(false)
 const [cancelError, setCancelError] = useState('')

 const fetchOrders = () => {
  setLoading(true)
  getMyOrders()
   .then(res => setOrders(res.orders || []))
   .catch(console.error)
   .finally(() => setLoading(false))
 }

 useEffect(() => {
  fetchOrders()
 }, [])

 const toggleExpand = (orderId) => {
  setExpandedOrderIds(prev => prev.includes(orderId)
   ? prev.filter(id => id !== orderId)
   : [...prev, orderId]
  )
 }

 const resetCancelModal = () => {
  setCancelOrderId(null)
  setCancelReason('')
  setCancelOtherReason('')
  setCancelAgreement(false)
  setCancelError('')
 }

 const handleCancelOrder = async () => {
  if (!cancelOrderId) return
  const finalReason = cancelReason === 'others' ? cancelOtherReason.trim() : cancelReason
  if (!finalReason) {
   setCancelError('Please select a cancellation reason.')
   return
  }
  if (cancelReason === 'others' && !cancelOtherReason.trim()) {
   setCancelError('Please write your cancellation reason.')
   return
  }
  if (!cancelAgreement) {
   setCancelError('You must agree to the cancellation consequences.')
   return
  }
  setUpdatingOrderId(cancelOrderId)
  try {
   await updateOrderStatus(cancelOrderId, {
    status: 'cancelled',
    cancellation_reason: cancelReason,
    cancellation_note: cancelReason === 'others' ? cancelOtherReason.trim() : '',
    acknowledged_consequences: true,
   })
   resetCancelModal()
   fetchOrders()
  } catch (err) {
   setCancelError(err.message || 'Failed to cancel order.')
  } finally {
   setUpdatingOrderId(null)
  }
 }

 if (loading) {
  return (
   <div className="py-10 text-center animate-pulse">
    <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto" />
   </div>
  )
 }

 return (
  <div className="space-y-4 animate-slide-up">
   <button onClick={onBack} className="flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary transition-colors">
    <ArrowLeft size={14} /> Back
   </button>
   <h3 className="text-base font-bold text-theme-text border-b border-theme-border pb-3">Order History</h3>

   {orders.length === 0 ? (
    <div className="text-center py-10 bg-theme-card rounded-2xl border border-theme-border">
     <ShoppingBag size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
     <p className="text-sm font-medium text-theme-muted">No orders yet.</p>
    </div>
   ) : (
    <div className="space-y-4">
      {orders.map(order => {
       const sellerContacts = Array.from(
        new Map((order.items || [])
         .map(item => [item.seller_id, { name: item.seller_name || 'N/A', phone: item.seller_phone || 'N/A' }]))
         .values()
       )

       return (
       <div key={order.id} className={`bg-theme-card border rounded-2xl p-4 shadow-sm ${highlightedOrderId === order.id ? 'border-theme-primary ring-1 ring-theme-primary/30' : 'border-theme-border'}`}>
        <div className="flex items-center justify-between border-b border-theme-border pb-3 mb-3">
        <div>
         <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-theme-text">Order #{order.id}</p>
          {order.is_booking && (
           <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 uppercase tracking-tight">Booking</span>
          )}
         </div>
         <p className="text-[10px] text-theme-muted">{formatDate(order.created_at)}</p>
        </div>
         <div className="text-right">
          <p className="text-sm font-bold text-rose-500">৳{Number(order.total_amount).toLocaleString()}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${STATUS_BADGE[order.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
           {order.status}
          </span>
         </div>
        </div>
        <div className="space-y-3">
         {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-theme-bg/50 p-2.5 rounded-xl">
           <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0">
            {item.main_image ? (
             <img src={item.main_image} alt={item.title} className="w-full h-full object-cover" />
            ) : <Package size={16} className="m-auto mt-2 text-theme-muted" />}
           </div>
           <div>
            <Link to={`/product/${item.product_id}`} className="text-xs font-semibold text-theme-text hover:text-theme-primary truncate block max-w-[150px] sm:max-w-[200px]">
             {item.title}
            </Link>
            <p className="text-[10px] text-theme-muted mt-0.5">৳{Number(item.price).toLocaleString()} × {item.quantity}</p>
           </div>
          </div>
          {order.status === 'cancelled' ? (
           <span className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            Review unavailable
           </span>
          ) : item.review_id ? (
           <span className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            Reviewed
           </span>
          ) : (
           <button onClick={() => setReviewItem(item)} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-colors">
            â­ Review
           </button>
          )}
          </div>
         ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
         <button onClick={() => toggleExpand(order.id)} className="text-xs text-theme-primary font-semibold hover:underline">
          {expandedOrderIds.includes(order.id) ? 'Hide details' : 'View details'}
         </button>
         <Link to={`/orders/${order.id}`} className="text-xs text-theme-muted hover:text-theme-primary">Open full order â†’</Link>
        </div>
         {expandedOrderIds.includes(order.id) && (
          <div className="mt-3 pt-3 border-t border-theme-border space-y-2">
           {sellerContacts.map((seller, idx) => (
            <p key={`${seller.name}-${idx}`} className="text-[11px] text-theme-muted">
             Seller {sellerContacts.length > 1 ? `${idx + 1}` : ''}: {seller.name} Â· {seller.phone}
            </p>
           ))}
           {order.note && <p className="text-[11px] text-theme-muted">Note: {order.note}</p>}
           <div className="flex flex-wrap gap-2 pt-1">
            {['pending', 'confirmed', 'shipped'].includes(order.status) && (
             <button onClick={() => setCancelOrderId(order.id)} disabled={updatingOrderId === order.id}
              className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-60">
              {updatingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
             </button>
           )}
           {order.items?.[0] && (
            <Link
             to={`/messages?user=${order.items[0].seller_id}&product=${order.items[0].product_id}`}
             className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors"
            >
             Chat with Seller
            </Link>
           )}
          </div>
          </div>
         )}
        </div>
       )})}
      </div>
    )}

    {cancelOrderId && (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-theme-card border border-theme-border rounded-3xl shadow-xl p-6">
       <h3 className="text-lg font-bold text-theme-text">Cancel Order #{cancelOrderId}</h3>
       <p className="text-xs text-theme-muted mt-1">Please complete the required details before cancellation.</p>

       {cancelError && <p className="text-xs text-red-500 mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-2 rounded-lg">{cancelError}</p>}

       <div className="mt-4 space-y-3">
        <div>
         <label htmlFor="profile-input-6" className="block text-xs font-semibold text-theme-text mb-1">Cancellation reason *</label>
         <select id="profile-input-6"
          value={cancelReason}
          onChange={(e) => {
           setCancelReason(e.target.value)
           setCancelError('')
           if (e.target.value !== 'others') setCancelOtherReason('')
          }}
          className="input-field py-2 text-sm"
         >
          <option value="">Select one reason</option>
          {BUYER_CANCEL_REASONS.map(reason => (
           <option key={reason.value} value={reason.value}>{reason.label}</option>
          ))}
         </select>
        </div>

        {cancelReason === 'others' && (
         <div>
          <label htmlFor="profile-input-7" className="block text-xs font-semibold text-theme-text mb-1">Write your reason *</label>
          <input id="profile-input-7"
           type="text"
           value={cancelOtherReason}
           onChange={(e) => {
            setCancelOtherReason(e.target.value)
            setCancelError('')
           }}
           className="input-field py-2 text-sm"
           placeholder="Write your cancellation reason"
          />
         </div>
        )}

        <div className="rounded-xl border border-theme-border bg-theme-bg/50 p-3 text-[11px] text-theme-muted space-y-1">
         <p className="font-semibold text-theme-text text-xs">Cancellation consequences</p>
         <p>â€¢ Order stats may be reverted for both buyer and seller.</p>
         <p>â€¢ Earned points from this order will be deducted from your account.</p>
         <p>â€¢ Existing reviews for this order will be removed automatically.</p>
         <p>â€¢ Seller will receive a full cancellation report notification.</p>
        </div>

        <label className="flex items-start gap-2 text-xs text-theme-muted">
         <input
          type="checkbox"
          checked={cancelAgreement}
          onChange={(e) => {
           setCancelAgreement(e.target.checked)
           setCancelError('')
          }}
          className="mt-0.5"
         />
         <span>I understand and agree to all cancellation consequences.</span>
        </label>
       </div>

       <div className="mt-5 flex justify-end gap-2">
        <button onClick={resetCancelModal} disabled={updatingOrderId === cancelOrderId} className="px-4 py-2 text-xs font-bold rounded-lg border border-theme-border text-theme-muted hover:bg-theme-bg/70 disabled:opacity-60">
         Close
        </button>
        <button
         onClick={handleCancelOrder}
         disabled={updatingOrderId === cancelOrderId}
         className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-800 text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-60"
        >
         {updatingOrderId === cancelOrderId ? 'Cancelling...' : 'Confirm Cancellation'}
        </button>
       </div>
      </div>
     </div>
    )}

     {reviewItem && (
      <ReviewModal item={reviewItem} onClose={() => setReviewItem(null)} onSubmitted={fetchOrders} />
    )}
   </div>
  )
}

function ReviewModal({ item, onClose, onSubmitted }) {
 const [rating, setRating] = useState(5)
 const [comment, setComment] = useState('')
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [submitted, setSubmitted] = useState(false)

 const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)
  setError('')
  try {
   await addReview({
    order_item_id: item.id,
    rating,
    comment
   })
   setSubmitted(true)
   onSubmitted?.()
  } catch (err) {
   setError(err.message || 'Failed to submit review. You may have already reviewed this item.')
  } finally {
   setLoading(false)
  }
 }

 return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
   <div className="w-full max-w-sm bg-theme-card border border-theme-border rounded-3xl shadow-xl p-6 relative">
    <button onClick={onClose} className="absolute top-4 right-4 text-theme-muted hover:text-gray-600 dark:hover:text-gray-200">
     <X size={20} />
    </button>
    {!submitted ? (
     <>
      <h3 className="text-lg font-bold text-theme-text mb-1">Leave a Review</h3>
      <p className="text-xs text-theme-muted mb-4 truncate text-center w-full block">For {item.title}</p>
      {error && <p className="text-xs text-red-500 mb-3 bg-red-50 dark:bg-red-950/30 dark:border dark:border-red-900 p-2 rounded-lg">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
       <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 text-center">Tap to rate</label>
        <div className="flex gap-1 justify-center py-2">
         {[1, 2, 3, 4, 5].map(star => (
          <button type="button" key={star} onClick={() => setRating(star)} className={`text-3xl transition-transform ${star <= rating ? 'text-amber-400 scale-110' : 'text-gray-200 dark:text-gray-700'} hover:scale-125`}>
           â˜…
          </button>
         ))}
        </div>
       </div>
       <div>
        <label htmlFor="profile-input-8" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Comment (Optional)</label>
        <textarea id="profile-input-8" value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="How was your experience?" className="input-field text-sm p-3 w-full" />
       </div>
       <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 mt-2">
        {loading ? 'Submitting...' : 'Submit Review'}
       </button>
      </form>
     </>
    ) : (
     <div className="text-center py-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-3xl">âœ“</div>
      <h4 className="text-base font-bold text-theme-text">Review Submitted</h4>
      <p className="text-xs text-theme-muted mt-1">Thanks! Your {rating}-star review for this order item is now saved.</p>
      <button onClick={onClose} className="btn-primary w-full py-2.5 text-sm mt-4">Done</button>
     </div>
    )}
   </div>
  </div>
 )
}


