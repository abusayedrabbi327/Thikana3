import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Package, XCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { getOrderById, updateOrderStatus } from '../services/api'

function formatDateTime(dateStr) {
 if (!dateStr) return 'N/A'
 return new Date(dateStr).toLocaleString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
 })
}

const STATUS_BADGE = {
 pending:   'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800',
 confirmed:  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800',
 shipped:   'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800',
 delivered:  'bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200 dark:border-purple-800',
 cancelled:  'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800',
}

const BUYER_CANCEL_REASONS = [
 { value: 'changed_mind', label: 'Changed my mind' },
 { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
 { value: 'found_better_option', label: 'Found a better option' },
 { value: 'delivery_taking_too_long', label: 'Delivery is taking too long' },
 { value: 'payment_or_budget_issue', label: 'Payment or budget issue' },
 { value: 'others', label: 'Others' },
]

const SELLER_CANCEL_REASONS = [
 { value: 'item_out_of_stock', label: 'Item is out of stock' },
 { value: 'listing_issue', label: 'Listing information issue' },
 { value: 'unable_to_fulfill', label: 'Unable to fulfill the order now' },
 { value: 'buyer_unreachable', label: 'Buyer is unreachable' },
 { value: 'logistics_issue', label: 'Logistics or delivery issue' },
 { value: 'others', label: 'Others' },
]

export default function OrderDetails() {
 const { id } = useParams()
 const navigate = useNavigate()
 const { user } = useAuth()
 const [order, setOrder] = useState(null)
 const [loading, setLoading] = useState(true)
 const [updating, setUpdating] = useState(false)
 const [error, setError] = useState('')
 const [showCancelDialog, setShowCancelDialog] = useState(false)
 const [cancelReason, setCancelReason] = useState('')
 const [cancelOtherReason, setCancelOtherReason] = useState('')
 const [cancelAgreement, setCancelAgreement] = useState(false)
 const [cancelError, setCancelError] = useState('')

 const loadOrder = async () => {
  setLoading(true)
  setError('')
  try {
   const res = await getOrderById(id)
   setOrder(res.order || null)
  } catch (err) {
   setError(err.message || 'Failed to load order details.')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => {
  if (!user) { navigate('/login'); return }
  loadOrder()
 }, [id, user, navigate])

  const subtotal = useMemo(() => (
   Number(order?.items?.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0) || 0)
  ), [order])
  const deliveryFee = Number(order?.delivery_fee || 0)
  const isBuyerContext = !!order?.permissions?.is_buyer
  const sellerContacts = useMemo(() => (
   Array.from(
    new Map((order?.items || [])
     .map(item => [item.seller_id, { name: item.seller_name || 'N/A', phone: item.seller_phone || 'N/A' }]))
     .values()
   )
  ), [order])

 const cancellationReasons = isBuyerContext ? BUYER_CANCEL_REASONS : SELLER_CANCEL_REASONS

 const resetCancelDialog = () => {
  setCancelReason('')
  setCancelOtherReason('')
  setCancelAgreement(false)
  setCancelError('')
  setShowCancelDialog(false)
 }

 const handleCancel = async () => {
   if (!order || updating) return
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
   setUpdating(true)
   setCancelError('')
   try {
    await updateOrderStatus(order.id, {
     status: 'cancelled',
     cancellation_reason: cancelReason,
     cancellation_note: cancelReason === 'others' ? cancelOtherReason.trim() : '',
     acknowledged_consequences: true,
    })
    resetCancelDialog()
    await loadOrder()
   } catch (err) {
    setCancelError(err.message || 'Failed to cancel order.')
   } finally {
    setUpdating(false)
   }
 }

 const handleChat = () => {
  if (!order || !order.items?.length) return
  if (order.permissions?.is_buyer) {
   const first = order.items[0]
   navigate(`/messages?user=${first.seller_id}&product=${first.product_id}`)
   return
  }
  if (order.permissions?.is_seller) {
   const first = order.items[0]
   navigate(`/messages?user=${order.buyer_id}&product=${first.product_id}`)
  }
 }

 if (loading) {
  return (
   <>
    <Navbar />
    <div className="min-h-screen pt-24 bg-theme-bg flex items-center justify-center">
     <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
    </div>
   </>
  )
 }

 if (error || !order) {
  return (
   <>
    <Navbar />
    <main className="min-h-screen pt-24 pb-12 bg-theme-bg px-4">
     <div className="glass-card max-w-3xl mx-auto p-6">
      <p className="text-sm text-red-500">{error || 'Order not found.'}</p>
      <Link to="/profile" className="inline-block mt-3 text-sm text-theme-primary hover:underline">Go back</Link>
     </div>
    </main>
    <Footer />
   </>
  )
 }

 return (
  <>
   <Navbar />
   <main className="min-h-screen pt-24 pb-16 bg-theme-bg">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
     <div className="flex items-center justify-between">
      <Link to="/profile?view=orders" className="inline-flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary">
       <ArrowLeft size={16} /> Back
      </Link>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${STATUS_BADGE[order.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
       {order.status}
      </span>
     </div>

     <div className="glass-panel p-5">
      <div className="flex items-center gap-2">
       <h1 className="text-lg font-bold text-theme-text">Order #{order.id}</h1>
       {order.is_booking && (
        <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 uppercase tracking-tight">Booking</span>
       )}
      </div>
      <p className="text-xs text-theme-muted mt-1">Placed on {formatDateTime(order.created_at)}</p>

      <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs">
       <div className="p-3 rounded-xl bg-theme-bg/60">
        <p className="font-semibold text-theme-text mb-1">Shipping Address</p>
        <p className="text-theme-muted whitespace-pre-line">{order.shipping_address || 'N/A'}</p>
       </div>
        <div className="p-3 rounded-xl bg-theme-bg/60">
         <p className="font-semibold text-theme-text mb-1">{isBuyerContext ? 'Your Contact' : 'Contact'}</p>
         {isBuyerContext ? (
          <>
           <p className="text-theme-muted">{order.buyer_name || 'You'}</p>
           <p className="text-theme-muted">{order.phone || order.buyer_phone || 'N/A'}</p>
          </>
         ) : (
          <>
           <p className="text-theme-muted">{order.buyer_name || 'N/A'}</p>
           <p className="text-theme-muted">{order.buyer_phone || order.phone || 'N/A'}</p>
          </>
         )}
         {order.note && <p className="text-theme-muted mt-2">Note: {order.note}</p>}
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-theme-bg/60 text-xs">
       <p className="font-semibold text-theme-text mb-2">{isBuyerContext ? 'Seller' : 'Buyer'}</p>
       {isBuyerContext ? (
        sellerContacts.length ? (
         sellerContacts.map((seller, idx) => (
          <p key={`${seller.name}-card-${idx}`} className="text-theme-muted">
           {sellerContacts.length > 1 ? `Seller ${idx + 1}: ` : ''}{seller.name} · {seller.phone}
          </p>
         ))
        ) : <p className="text-theme-muted">N/A</p>
       ) : (
        <>
         <p className="text-theme-muted">{order.buyer_name} · {order.buyer_email || 'N/A'}</p>
         <p className="text-theme-muted">{order.buyer_phone || order.phone || 'N/A'}</p>
        </>
       )}
       </div>

      <div className="mt-4 space-y-2">
       {order.items?.map(item => (
        <div key={item.id} className="flex items-center justify-between gap-3 bg-theme-bg/60 p-3 rounded-xl">
         <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
           {item.main_image ? <img src={item.main_image} alt={item.title} className="w-full h-full object-cover" /> : <Package size={16} className="m-auto mt-2 text-theme-muted" />}
          </div>
          <div className="min-w-0">
           <Link to={`/product/${item.product_id}`} className="text-xs font-semibold text-theme-text hover:text-theme-primary truncate block max-w-[180px] sm:max-w-[320px]">{item.title}</Link>
           <p className="text-[11px] text-theme-muted">৳{Number(item.price).toLocaleString()} × {item.quantity}</p>
          </div>
         </div>
         <p className="text-xs font-semibold text-rose-500">৳{(Number(item.price) * Number(item.quantity)).toLocaleString()}</p>
        </div>
       ))}
      </div>

      <div className="mt-4 border-t border-theme-border pt-3 text-xs space-y-1">
       <div className="flex justify-between text-theme-muted"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
       <div className="flex justify-between text-theme-muted"><span>Delivery Fee</span><span>৳{deliveryFee.toLocaleString()}</span></div>
       <div className="flex justify-between font-bold text-theme-text text-sm"><span>Total</span><span>৳{Number(order.total_amount).toLocaleString()}</span></div>
       <div className="pt-1 space-y-0.5">
        <p className="text-theme-muted">Paid on: {formatDateTime(order.created_at)}</p>
        <p className="text-theme-muted">Paid by: COD</p>
       </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {order.permissions?.can_cancel && order.status !== 'cancelled' && (
         <button onClick={() => setShowCancelDialog(true)} disabled={updating}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-800 text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-60">
          <XCircle size={14} /> {updating ? 'Cancelling...' : 'Cancel Order'}
         </button>
       )}
       <button onClick={handleChat}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40">
        <MessageSquare size={14} /> Chat
       </button>
      </div>
     </div>
    </div>
    </main>
    {showCancelDialog && (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 glass-overlay animate-fade-in">
      <div className="glass-modal w-full max-w-lg p-6">
       <h3 className="text-lg font-bold text-theme-text">Cancel Order #{order.id}</h3>
       <p className="text-xs text-theme-muted mt-1">Please complete the required details before cancellation.</p>

       {cancelError && <p className="text-xs text-red-500 mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-2 rounded-lg">{cancelError}</p>}

       <div className="mt-4 space-y-3">
        <div>
         <label htmlFor="orderdetails-input-1" className="block text-xs font-semibold text-theme-text mb-1">Cancellation reason *</label>
         <select id="orderdetails-input-1"
          value={cancelReason}
          onChange={(e) => {
           setCancelReason(e.target.value)
           setCancelError('')
           if (e.target.value !== 'others') setCancelOtherReason('')
          }}
          className="input-field py-2 text-sm"
         >
          <option value="">Select one reason</option>
          {cancellationReasons.map(reason => (
           <option key={reason.value} value={reason.value}>{reason.label}</option>
          ))}
         </select>
        </div>

        {cancelReason === 'others' && (
         <div>
          <label htmlFor="orderdetails-input-2" className="block text-xs font-semibold text-theme-text mb-1">Write your reason *</label>
          <input id="orderdetails-input-2"
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
         <p>• Order stats may be reverted for both buyer and seller.</p>
         <p>• Earned points from this order will be deducted from the buyer account.</p>
         <p>• Existing reviews for this order will be removed automatically.</p>
         <p>• A full cancellation report will be sent to the other party.</p>
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
        <button onClick={resetCancelDialog} disabled={updating} className="px-4 py-2 text-xs font-bold rounded-lg border border-theme-border text-theme-muted hover:bg-theme-bg/70 disabled:opacity-60">
         Close
        </button>
        <button
         onClick={handleCancel}
         disabled={updating}
         className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-800 text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-60"
        >
         <XCircle size={14} /> {updating ? 'Cancelling...' : 'Confirm Cancellation'}
        </button>
       </div>
      </div>
     </div>
    )}
    <Footer />
   </>
  )
}
