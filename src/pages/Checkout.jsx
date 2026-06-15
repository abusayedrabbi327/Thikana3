import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Package, CheckCircle2, ShoppingBag } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { placeOrder } from '../services/api'

const formatPrice = (p) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(p)

export default function Checkout() {
 const navigate = useNavigate()
 const { user } = useAuth()
 const { cart, cartTotal, refreshCart, refreshCount } = useCart()

 const [address, setAddress] = useState(user?.address || '')
 const [phone, setPhone]  = useState(user?.phone || '')
 const [note, setNote]   = useState('')
 const [deliveryType, setDeliveryType] = useState('inside')
 const [loading, setLoading] = useState(false)
 const [error, setError]  = useState('')
 const [success, setSuccess] = useState(null)
 const [pageLoading, setPageLoading] = useState(true)

 useEffect(() => {
  if (!user) { navigate('/login'); return }
  if (user.is_admin || user.role !== 'buyer') { navigate('/'); return }
  if (!user.nid_verified) { navigate('/verify-nid'); return }
  refreshCart().finally(() => setPageLoading(false))
 }, [user, navigate, refreshCart])

 const handleSubmit = async (e) => {
  e.preventDefault()
  if (!address.trim()) { setError('Please enter your shipping address.'); return }
  if (!phone.trim()) { setError('Please enter your phone number.'); return }
  setLoading(true)
  setError('')
  try {
   const res = await placeOrder({
    shipping_address: address.trim(),
    phone: phone.trim(),
    note: note.trim() || undefined,
    delivery_type: deliveryType
   })
   setSuccess(res)
   refreshCount()
  } catch (err) {
   setError(err.message || 'Failed to place order.')
  } finally {
   setLoading(false)
  }
 }

 if (pageLoading) {
  return (
   <>
    <Navbar />
    <div className="min-h-screen flex items-center justify-center pt-16 bg-theme-bg">
     <div className="w-10 h-10 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
    </div>
   </>
  )
 }

 // Success state
 if (success) {
  return (
   <>
    <Navbar />
    <main className="min-h-screen bg-theme-bg pt-24 pb-16">
     <div className="max-w-lg mx-auto px-4 text-center animate-fade-in">
      <div className="glass-modal p-10">
       <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={40} className="text-emerald-500" />
       </div>
       <h2 className="text-2xl font-bold text-theme-text mb-2">Order Placed!</h2>
       <p className="text-theme-muted mb-2">Your order <span className="font-bold text-theme-primary">#{success.orderId}</span> has been confirmed.</p>
       <p className="text-2xl font-black text-rose-500 mb-6">৳{formatPrice(success.total)}</p>
       <div className="flex flex-col gap-3">
         <Link to="/profile?view=orders" className="btn-primary justify-center py-3">View My Orders</Link>
        <Link to="/" className="text-sm text-theme-muted hover:text-theme-primary font-medium transition-colors">Continue Shopping</Link>
       </div>
      </div>
     </div>
    </main>
    <Footer />
   </>
  )
 }

 // Empty cart redirect
 if (cart.length === 0) {
  return (
   <>
    <Navbar />
    <main className="min-h-screen bg-theme-bg pt-24 pb-16">
     <div className="max-w-lg mx-auto px-4 text-center">
      <div className="glass-panel p-10">
       <ShoppingBag size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
       <h3 className="text-lg font-bold text-theme-text mb-2">Cart is empty</h3>
       <p className="text-theme-muted text-sm mb-4">Add some items before checking out.</p>
       <Link to="/" className="btn-primary py-2 px-6">Browse Products</Link>
      </div>
     </div>
    </main>
    <Footer />
   </>
  )
 }

 return (
  <>
   <Navbar />
   <main className="min-h-screen bg-theme-bg pt-24 pb-16">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">

     <div className="flex items-center gap-3 mb-8">
      <Link to="/cart" className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-white dark:hover:bg-gray-900 border border-transparent hover:border-theme-border dark:hover:border-gray-800 transition-all">
       <ArrowLeft size={18} />
      </Link>
      <h1 className="text-2xl font-bold text-theme-text">Checkout</h1>
     </div>

     <div className="grid lg:grid-cols-3 gap-6">
      {/* Shipping Form */}
      <div className="lg:col-span-2">
       <form onSubmit={handleSubmit} className="glass-panel p-6">
        <h3 className="text-base font-bold text-theme-text mb-5">Delivery Information</h3>

        {error && (
         <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm">
          {error}
         </div>
        )}

        <div className="space-y-4">
         <div>
          <label htmlFor="shipping-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
           Shipping Address <span className="text-red-400">*</span>
          </label>
          <textarea id="shipping-address"
           value={address} onChange={e => { setAddress(e.target.value); setError('') }}
           placeholder="House no, Road no, Area, City" rows={3}
           className="input-field resize-none text-sm" />
         </div>
         <div>
          <label htmlFor="shipping-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
           Phone Number <span className="text-red-400">*</span>
          </label>
          <input id="shipping-phone" type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }}
           placeholder="01XXXXXXXXX" className="input-field py-2.5 text-sm" />
         </div>
         <div>
          <label htmlFor="shipping-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
           Note (optional)
          </label>
          <input id="shipping-note" type="text" value={note} onChange={e => setNote(e.target.value)}
           placeholder="Any special instructions..." className="input-field py-2.5 text-sm" />
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
           Delivery Method <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
           <button type="button" onClick={() => setDeliveryType('inside')}
            className={`flex flex-col p-3 rounded-xl border-2 transition-all text-left ${deliveryType === 'inside' ? 'border-theme-primary bg-theme-primary/10' : 'border-theme-border hover:border-gray-300'}`}>
            <span className="text-xs font-bold text-theme-text">Inside Dhaka</span>
            <span className="text-[10px] text-theme-muted font-black mt-1">৳20</span>
           </button>
           <button type="button" onClick={() => setDeliveryType('outside')}
            className={`flex flex-col p-3 rounded-xl border-2 transition-all text-left ${deliveryType === 'outside' ? 'border-theme-primary bg-theme-primary/10' : 'border-theme-border hover:border-gray-300'}`}>
            <span className="text-xs font-bold text-theme-text">Outside Dhaka</span>
            <span className="text-[10px] text-theme-muted font-black mt-1">৳50</span>
           </button>
          </div>
         </div>
        </div>

        <button type="submit" disabled={loading}
         className="btn-primary w-full justify-center py-3 text-sm mt-6 disabled:opacity-70">
         {loading ? 'Placing Order…' : `Confirm Order — ৳${formatPrice(cartTotal + (deliveryType === 'outside' ? 50 : 20))}`}
        </button>
       </form>
      </div>

      {/* Items Summary */}
      <div className="lg:col-span-1">
       <div className="glass-panel p-5 sticky top-24">
        <h3 className="text-sm font-bold text-theme-text mb-4">
         Your Items ({cart.length})
        </h3>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
         {cart.map(item => (
          <div key={item.cart_item_id} className="flex gap-3">
           <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            {item.main_image
             ? <img src={item.main_image} alt={item.title} className="w-full h-full object-cover" />
             : <div className="w-full h-full flex items-center justify-center text-theme-muted"><Package size={16} /></div>
            }
           </div>
           <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-theme-text line-clamp-1">{item.title}</p>
            <p className="text-xs text-theme-muted mt-0.5 flex items-center gap-0.5">
             <MapPin size={8} /> {item.location}
            </p>
            <p className="text-sm font-bold text-rose-500 mt-0.5">৳{formatPrice(item.price)}</p>
           </div>
          </div>
         ))}
        </div>
        <div className="h-px bg-gray-100 dark:bg-gray-800 my-4" />
        <div className="flex justify-between text-sm text-theme-muted mb-2">
         <span>Subtotal</span>
         <span>৳{formatPrice(cartTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-theme-muted mb-4">
         <span>Delivery</span>
         <span>৳{deliveryType === 'outside' ? 50 : 20}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-theme-text">
         <span>Total</span>
         <span className="text-rose-500">৳{formatPrice(cartTotal + (deliveryType === 'outside' ? 50 : 20))}</span>
        </div>
       </div>
      </div>
     </div>
    </div>
   </main>
   <Footer />
  </>
 )
}
