import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, ShoppingBag, ShieldCheck, MapPin, Package } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const formatPrice = (p) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(p)

export default function Cart() {
 const navigate = useNavigate()
 const { user } = useAuth()
 const { cart, cartTotal, refreshCart, removeFromCart } = useCart()
 const [loading, setLoading] = useState(true)
 const [removing, setRemoving] = useState(null)

 useEffect(() => {
  if (!user) { navigate('/login'); return }
  if (user.is_admin || user.role !== 'buyer') { navigate('/'); return }
  refreshCart().finally(() => setLoading(false))
 }, [user, navigate, refreshCart])

 const handleRemove = async (id) => {
  setRemoving(id)
  try { await removeFromCart(id) }
  catch { /* toast */ }
  finally { setRemoving(null) }
 }

 if (loading) {
  return (
   <>
    <Navbar />
    <div className="min-h-screen flex items-center justify-center pt-16 bg-theme-bg">
     <div className="w-10 h-10 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
    </div>
   </>
  )
 }

 return (
  <>
   <Navbar />
   <main className="min-h-screen bg-theme-bg pt-24 pb-16">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">

     {/* Header */}
     <div className="flex items-center gap-3 mb-8">
      <Link to="/" className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-white dark:hover:bg-gray-900 border border-transparent hover:border-theme-border dark:hover:border-gray-800 transition-all">
       <ArrowLeft size={18} />
      </Link>
      <h1 className="text-2xl font-bold text-theme-text">Shopping Cart</h1>
      {cart.length > 0 && (
       <span className="text-sm text-theme-muted font-medium">({cart.length} item{cart.length > 1 ? 's' : ''})</span>
      )}
     </div>

     {cart.length === 0 ? (
      <div className="text-center py-20 glass-panel">
       <ShoppingBag size={56} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
       <h3 className="text-xl font-bold text-theme-text mb-2">Your cart is empty</h3>
       <p className="text-theme-muted text-sm mb-6 max-w-sm mx-auto">
        Browse our marketplace and add some furniture or appliances you love!
       </p>
       <Link to="/" className="btn-primary py-2.5 px-6">Browse Products</Link>
      </div>
     ) : (
      <div className="grid lg:grid-cols-3 gap-6">
       {/* Cart Items */}
       <div className="lg:col-span-2 space-y-3">
        {cart.map(item => (
         <div key={item.cart_item_id}
          className={`glass-card p-4 flex gap-4 transition-all duration-200
           ${item.status !== 'approved' ? 'opacity-60' : ''} ${removing === item.cart_item_id ? 'scale-95 opacity-50' : ''}`}>
          <Link to={`/product/${item.product_id}`} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
           {item.main_image
            ? <img src={item.main_image} alt={item.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-theme-muted"><Package size={24} /></div>
           }
          </Link>
          <div className="flex-1 min-w-0">
           <Link to={`/product/${item.product_id}`} className="font-semibold text-theme-text text-sm hover:text-theme-primary transition-colors line-clamp-1">
            {item.title}
           </Link>
           <p className="text-xs text-theme-muted mt-0.5 flex items-center gap-1">
            <MapPin size={10} className="text-theme-primary" /> {item.location}
           </p>
           <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-medium text-theme-muted capitalize">
             {item.category}
            </span>
            {item.seller_verified === 1 && (
             <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
              <ShieldCheck size={10} /> Verified
             </span>
            )}
           </div>
           {item.status !== 'approved' && (
            <p className="text-xs text-red-500 font-medium mt-1">This item is no longer available</p>
           )}
           <div className="flex items-center justify-between mt-2">
            <p className="text-lg font-black text-rose-500">৳{formatPrice(item.price)}</p>
            <button onClick={() => handleRemove(item.cart_item_id)}
             className="p-2 rounded-lg text-theme-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
             title="Remove">
             <Trash2 size={16} />
            </button>
           </div>
          </div>
         </div>
        ))}
       </div>

       {/* Order Summary */}
       <div className="lg:col-span-1">
        <div className="glass-panel p-6 sticky top-24">
         <h3 className="text-base font-bold text-theme-text mb-4">Order Summary</h3>
         <div className="space-y-3 mb-5 text-sm">
          <div className="flex justify-between text-theme-muted">
           <span>Subtotal ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
           <span className="font-semibold text-theme-text">৳{formatPrice(cartTotal)}</span>
          </div>
          <div className="flex justify-between text-theme-muted">
           <span>Delivery</span>
           <span className="text-theme-text font-medium">৳50</span>
          </div>
          <div className="h-px bg-gray-100 dark:bg-gray-800" />
          <div className="flex justify-between text-theme-text font-bold text-base">
           <span>Total</span>
           <span className="text-rose-500">৳{formatPrice(cartTotal + 50)}</span>
          </div>
         </div>
         <Link to="/checkout"
          className="btn-primary w-full justify-center py-3 text-sm">
          Proceed to Checkout
         </Link>
         <Link to="/"
          className="block text-center text-sm text-theme-muted hover:text-theme-primary mt-3 transition-colors font-medium">
          Continue Shopping
         </Link>
        </div>
       </div>
      </div>
     )}
    </div>
   </main>
   <Footer />
  </>
 )
}
