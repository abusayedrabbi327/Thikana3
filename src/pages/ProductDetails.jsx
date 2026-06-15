import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Heart, Share2, ShieldCheck, ChevronLeft, ChevronRight,
  ShoppingBag, ShoppingCart, Check, User, Package, Eye, Phone, CalendarCheck, X, Sparkles
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getProductById, getProductReviews, toggleFavourite, getFavouriteStatus, placeBooking, sendMsg } from '../services/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const formatPrice = (p) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(p)
const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

function LocationMap({ location, lat, lng }) {
  const [coords, setCoords] = useState(null)

  useEffect(() => {
    // 1. If we have precise DB coordinates, use them immediately!
    if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      return setCoords([parseFloat(lat), parseFloat(lng)]);
    }

    // 2. Otherwise fallback to geocoding the location string
    if (!location) return setCoords([23.8103, 90.4125]);

    const fetchCoords = async (query) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        return data && data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
      } catch {
        return null;
      }
    };

    const getBestCoords = async () => {
      let coords = await fetchCoords(location);
      if (coords) return setCoords(coords);

      const parts = location.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        coords = await fetchCoords(`${parts[0]}, ${parts[parts.length - 1]}`);
        if (coords) return setCoords(coords);

        coords = await fetchCoords(parts[0]);
        if (coords) return setCoords(coords);

        if (parts.length > 2) {
          coords = await fetchCoords(`${parts[parts.length - 2]}, ${parts[parts.length - 1]}`);
          if (coords) return setCoords(coords);
        }
      }

      setCoords([23.8103, 90.4125]);
    };

    getBestCoords();
  }, [location, lat, lng])

  if (!coords) return <div className="h-64 bg-theme-bg/50 rounded-2xl animate-pulse border border-theme-border" />

  return (
    <div className="h-64 rounded-2xl overflow-hidden border border-theme-border shadow-sm relative z-0">
      <MapContainer center={coords} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coords}>
          <Popup>{location}</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

import React from 'react'

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-theme-bg pt-24 px-4 text-center">
          <div className="max-w-2xl mx-auto bg-theme-card rounded-3xl p-8 border border-theme-border text-left">
            <h2 className="text-xl font-bold text-red-500 mb-4">Rendering Error Caught</h2>
            <pre className="font-mono text-xs text-theme-text bg-theme-bg p-4 rounded-xl overflow-auto whitespace-pre-wrap max-h-96">
              {this.state.error?.stack || String(this.state.error)}
            </pre>
            <div className="mt-6 text-center">
              <button onClick={() => window.location.reload()} className="btn-primary py-2 px-6">Reload Page</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ProductDetails() {
  return (
    <ErrorBoundary>
      <ProductDetailsInner />
    </ErrorBoundary>
  )
}

function ProductDetailsInner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToCart, cart } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [saved, setSaved] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  const [inCart, setInCart] = useState(false)
  const [reviews, setReviews] = useState([])
  const [showBooking, setShowBooking] = useState(false)
  const [bookingAmount, setBookingAmount] = useState(null)
  const [customAmount, setCustomAmount] = useState('')
  const [bookingPhone, setBookingPhone] = useState(user?.phone || '')
  const [bookingNote, setBookingNote] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState(null)
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  const [avgRating, setAvgRating] = useState(0)
  const [inCompare, setInCompare] = useState(false)

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('thikana_compare') || '[]')
      setInCompare(items.includes(parseInt(id)))
    } catch (_e) {}
  }, [id])

  const handleToggleCompare = () => {
    try {
      const items = JSON.parse(localStorage.getItem('thikana_compare') || '[]')
      const pId = parseInt(id)
      let nextItems = []
      if (items.includes(pId)) {
        nextItems = items.filter(x => x !== pId)
        setInCompare(false)
      } else {
        if (items.length >= 3) {
          alert('You can compare a maximum of 3 items.')
          return
        }
        nextItems = [...items, pId]
        setInCompare(true)
      }
      localStorage.setItem('thikana_compare', JSON.stringify(nextItems))
    } catch (_e) {}
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([getProductById(id), getProductReviews(id).catch(() => ({ reviews: [], avgRating: 0 }))])
      .then(([productData, reviewData]) => {
        setProduct(productData.product)
        setReviews(reviewData.reviews || [])
        setAvgRating(Number(reviewData.avgRating || 0))
        if (cart.some(item => item.product_id === parseInt(id))) setInCart(true)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Product not found.')
        setLoading(false)
      })
  }, [id, cart])

  // Sync inCart when cart changes
  useEffect(() => {
    if (cart.some(item => item.product_id === parseInt(id))) {
      setInCart(true)
    } else {
      setInCart(false)
    }
  }, [cart, id])

  // Fetch favourite status only for buyers
  useEffect(() => {
    if (!user || !id || user.role !== 'buyer' || user.is_admin) return
    getFavouriteStatus(id).then(data => setSaved(data.saved)).catch(() => { })
  }, [user, id])

  const handleToggleFavourite = async () => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'buyer' || user.is_admin) return
    setSavePending(true)
    try {
      const res = await toggleFavourite(id)
      setSaved(res.saved)
    } catch (err) {
      console.error(err)
    } finally {
      setSavePending(false)
    }
  }

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return }
    if (user.is_admin || user.role !== 'buyer') { return }
    if (!user.nid_verified) { navigate('/verify-nid?reason=cart'); return }
    setAddingToCart(true)
    try {
      await addToCart(parseInt(id))
      setInCart(true)
    } catch (err) {
      console.error(err)
    } finally {
      setAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    if (!user) { navigate('/login'); return }
    if (user.is_admin || user.role !== 'buyer') { return }
    if (!user.nid_verified) { navigate('/verify-nid?reason=buy'); return }
    setAddingToCart(true)
    try {
      await addToCart(parseInt(id))
      navigate('/checkout')
    } catch (err) {
      console.error(err)
    } finally {
      setAddingToCart(false)
    }
  }

  const handleMessage = () => {
    if (!user) { navigate('/login'); return }
    if (user.id === product.seller_id) return
    if (user.is_admin || !['buyer', 'seller'].includes(user.role)) return
    if (!user.nid_verified) { navigate('/verify-nid?reason=chat'); return }
    navigate(`/messages?user=${product.seller_id}&product=${id}`)
  }

  const sendPropertyInquiry = async ({ titleLine, introLine }) => {
    if (!user) { navigate('/login'); return }
    if (user.is_admin || !['buyer', 'seller'].includes(user.role)) return
    if (!user.nid_verified) { navigate('/verify-nid?reason=chat'); return }

    setInquiryLoading(true)
    setInquiryError('')

    const propertyLink = `${window.location.origin}/product/${id}`
    const payload = {
      receiver_id: seller_id,
      content: [
        introLine,
        '',
        `Property: ${title}`,
        `Location: ${location}`,
        `Price: ৳${formatPrice(price)}${category === 'house_rent' ? '/month' : ''}`,
        `Link: ${propertyLink}`,
      ].join('\n'),
      product_id: parseInt(id),
    }

    try {
      await sendMsg(payload)
      navigate(`/messages?user=${seller_id}&product=${id}`)
    } catch (err) {
      setInquiryError(err.message || `Failed to send ${titleLine.toLowerCase()}.`)
    } finally {
      setInquiryLoading(false)
    }
  }

  const handleOpenBooking = () => {
    if (!user) { navigate('/login'); return }
    if (user.is_admin || user.role !== 'buyer') return
    if (!user.nid_verified) { navigate('/verify-nid?reason=booking'); return }
    setBookingAmount(null)
    setCustomAmount('')
    setBookingPhone(user?.phone || '')
    setBookingNote('')
    setBookingError('')
    setShowBooking(true)
  }

  const getSelectedBookingAmount = () => {
    if (bookingAmount === 'custom') {
      const val = parseInt(customAmount)
      return isNaN(val) ? 0 : val
    }
    return bookingAmount || 0
  }

  const handleConfirmBooking = async () => {
    const amount = getSelectedBookingAmount()
    if (amount < 500) { setBookingError('Minimum booking amount is ৳500.'); return }
    if (!bookingPhone.trim()) { setBookingError('Please enter your phone number.'); return }
    setBookingLoading(true)
    setBookingError('')
    try {
      const res = await placeBooking({
        product_id: parseInt(id),
        booking_amount: amount,
        phone: bookingPhone.trim(),
        note: bookingNote.trim() || undefined,
      })
      setBookingSuccess(res)
      setShowBooking(false)
    } catch (err) {
      setBookingError(err.message || 'Failed to place booking.')
    } finally {
      setBookingLoading(false)
    }
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

  if (error || !product) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 px-4 text-center bg-theme-bg">
          <div className="max-w-md mx-auto bg-theme-card rounded-3xl p-8 border border-theme-border">
            <h2 className="text-xl font-bold text-theme-text mb-2">Oops!</h2>
            <p className="text-theme-muted mb-6">{error || 'Product not found.'}</p>
            <Link to="/" className="btn-primary py-2 px-6">Back to Home</Link>
          </div>
        </div>
      </>
    )
  }

  const {
    title, location, lat, lng, price, description, category, created_at, status, attributes,
    seller_name, seller_verified, seller_avatar, seller_phone, seller_email, seller_id,
    images, related, views,
  } = product

  const nextImage = () => setCurrentImageIndex(i => (i + 1) % images.length)
  const prevImage = () => setCurrentImageIndex(i => (i === 0 ? images.length - 1 : i - 1))

  const isSeller = user?.id === seller_id
  const isBuyer = user?.role === 'buyer' && !user?.is_admin
  const isCartable = ['furniture', 'appliance'].includes(category) && !isSeller && status !== 'sold' && isBuyer
  const isFlatInquiry = category === 'house_sell' && !isSeller && status !== 'sold' && isBuyer
  const isRentInquiry = category === 'house_rent' && !isSeller && status !== 'sold' && isBuyer
  const ratingStarsFilled = Math.round(avgRating)

  // Booking success screen
  if (bookingSuccess) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-theme-bg pt-24 pb-16">
          <div className="max-w-lg mx-auto px-4 text-center animate-fade-in">
            <div className="bg-theme-card rounded-3xl border border-theme-border p-10">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-5">
                <CalendarCheck size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-theme-text mb-2">Booking Confirmed!</h2>
              <p className="text-theme-muted mb-1">Your advance booking for</p>
              <p className="text-sm font-bold text-theme-text mb-2">{title}</p>
              <p className="text-theme-muted mb-2">Order <span className="font-bold text-theme-primary">#{bookingSuccess.orderId}</span></p>
              <p className="text-2xl font-black text-rose-500 mb-1">৳{formatPrice(bookingSuccess.total)}</p>
              <p className="text-xs text-theme-muted mb-6">Advance booking amount</p>
              {bookingSuccess.earnedPoints > 0 && (
                <p className="text-sm text-emerald-600 font-semibold mb-4">🎁 You earned {bookingSuccess.earnedPoints} reward points!</p>
              )}
              <div className="flex flex-col gap-3">
                <Link to="/profile?view=orders" className="btn-primary justify-center py-3">View My Orders</Link>
                <Link to="/" className="text-sm text-theme-muted hover:text-theme-primary font-medium transition-colors">Back to Home</Link>
              </div>
            </div>
          </div>
        </main>

        {/* ── Booking Modal ── */}
        {showBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-fade-in" onClick={() => setShowBooking(false)} onKeyDown={e => e.key === 'Escape' && setShowBooking(false)}>
            <div className="glass-modal w-full max-w-md p-6 sm:p-8 relative animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} role="document">
              <button onClick={() => setShowBooking(false)} className="absolute top-4 right-4 p-2 rounded-xl text-theme-muted hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all z-10">
                <X size={18} />
              </button>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CalendarCheck size={28} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-theme-text">Book This Property</h3>
                <p className="text-xs text-theme-muted mt-1">Select advance amount to secure your booking</p>
              </div>
              <div className="bg-theme-bg rounded-2xl p-4 mb-5 border border-theme-border">
                <p className="text-sm font-bold text-theme-text line-clamp-1">{title}</p>
                <p className="text-xs text-theme-muted flex items-center gap-1 mt-1"><MapPin size={10} className="text-theme-primary" /> {location}</p>
                <p className="text-base font-black text-rose-500 mt-1.5">৳{formatPrice(price)} <span className="text-xs font-semibold text-theme-muted">/month</span></p>
              </div>
              <div className="mb-5">
                <label htmlFor="booking-amount-2" className="block text-sm font-semibold text-theme-text mb-3">Select Advance Amount</label>
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  {[1000, 2000, 5000].map(amt => (
                    <button key={amt} type="button" onClick={() => { setBookingAmount(amt); setCustomAmount(''); setBookingError('') }}
                      className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${bookingAmount === amt ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'border-theme-border text-theme-muted hover:border-emerald-300 hover:text-emerald-600'}`}>
                      ৳{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <button type="button" onClick={() => { setBookingAmount('custom'); setBookingError('') }}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${bookingAmount === 'custom' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-theme-border'}`}>
                    <span className="text-theme-muted text-xs font-semibold">Other Amount</span>
                  </button>
                  {bookingAmount === 'custom' && (
                    <div className="mt-2 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted font-bold text-sm">৳</span>
                      <input type="number" min="500" value={customAmount} onChange={e => { setCustomAmount(e.target.value); setBookingError('') }}
                        placeholder="Min 500"
                        className="w-full bg-theme-bg border border-theme-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-theme-text placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 dark:focus:ring-emerald-900/40 transition-all" />
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-5">
                <label htmlFor="booking-phone-2" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Phone Number <span className="text-red-400">*</span></label>
                <input id="booking-phone-2" type="tel" value={bookingPhone} onChange={e => { setBookingPhone(e.target.value); setBookingError('') }}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 dark:focus:ring-emerald-900/40 transition-all" />
              </div>
              <div className="mb-5">
                <label htmlFor="booking-note-2" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Note (optional)</label>
                <input type="text" value={bookingNote} onChange={e => setBookingNote(e.target.value)}
                  placeholder="Move-in date, special requests..."
                  className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 dark:focus:ring-emerald-900/40 transition-all" />
              </div>
              {bookingError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-xs font-medium">
                  {bookingError}
                </div>
              )}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 mb-4 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-theme-muted">Advance Amount</span>
                  <span className="font-bold text-theme-text">৳{formatPrice(getSelectedBookingAmount())}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-theme-muted">Delivery Fee</span>
                  <span className="font-semibold text-emerald-600">Free</span>
                </div>
                <div className="h-px bg-emerald-100 dark:bg-emerald-900/30 my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-theme-text">Total</span>
                  <span className="text-rose-500">৳{formatPrice(getSelectedBookingAmount())}</span>
                </div>
              </div>
              <button onClick={handleConfirmBooking} disabled={bookingLoading || !bookingAmount}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                {bookingLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                ) : (
                  <><CalendarCheck size={18} /> Confirm Booking — ৳{formatPrice(getSelectedBookingAmount())}</>
                )}
              </button>
              <p className="text-[10px] text-theme-muted text-center mt-3">By confirming, you agree to the advance booking terms</p>
            </div>
          </div>
        )}

        <Footer />
      </>
    )
  }

  const totalSentimentCount = reviews.filter(r => r.sentiment_label).length
  const positiveCount = reviews.filter(r => r.sentiment_label === 'positive').length
  const positivePercent = totalSentimentCount > 0 ? Math.round((positiveCount / totalSentimentCount) * 100) : null

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-theme-bg pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">

          {/* Back */}
          <div className="mb-6 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-theme-muted hover:text-theme-primary transition-colors">
              <ArrowLeft size={16} /> Back to Home
            </Link>
            {views > 0 && (
              <span className="flex items-center gap-1 text-xs text-theme-muted">
                <Eye size={12} /> {views} views
              </span>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">

            {/* ── Image Gallery ── */}
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm group border border-theme-border">
                {images && images.length > 0 ? (
                  <>
                    <img src={images[currentImageIndex]} alt={title} className="w-full h-full object-cover transition-transform duration-500" />
                    {images.length > 1 && (
                      <>
                        <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-theme-card/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-theme-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-md">
                          <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-theme-card/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-theme-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-md">
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-theme-muted italic">
                    <Package size={48} className="mb-2 opacity-20" />
                    No images available
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  {category && (
                    <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                      {category.replaceAll('_', ' ')}
                    </span>
                  )}
                  {status === 'sold' && (
                    <span className="bg-rose-500 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-full">Sold Out</span>
                  )}
                </div>

                {/* Compare button */}
                <button onClick={handleToggleCompare}
                  className={`absolute top-4 right-16 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all
          ${inCompare ? 'bg-theme-primary text-white' : 'bg-theme-card/80 text-theme-muted hover:text-theme-primary'}`}
                  title={inCompare ? 'Remove from Compare' : 'Add to Compare'}
                >
                  <Sparkles size={18} className={inCompare ? 'animate-pulse' : ''} />
                </button>

                {/* Favourite button — buyers only */}
                {isBuyer && (
                  <button onClick={handleToggleFavourite} disabled={savePending}
                    className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all
            ${saved ? 'bg-rose-500 text-white' : 'bg-theme-card/80 text-theme-muted hover:text-rose-500'}`}>
                    <Heart size={18} className={saved ? 'fill-current' : ''} />
                  </button>
                )}
              </div>

              {images && images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {images.map((img, idx) => (
                    <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden snap-center border-2 transition-all
            ${idx === currentImageIndex ? 'border-theme-primary shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                      <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Details ── */}
            <div className="flex flex-col">
              <div className="mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-theme-text leading-snug">{title}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-theme-muted font-medium">
                  <span className="flex items-center gap-1"><MapPin size={14} className="text-theme-primary" /> {location}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <span>Posted {formatDate(created_at)}</span>
                </div>
              </div>

              <div className="mb-6 flex items-baseline gap-2">
                <p className="text-2xl font-black text-rose-500">৳{formatPrice(price)}</p>
                {category === 'house_rent' && <span className="text-sm font-semibold text-theme-muted">/month</span>}
              </div>

              {inquiryError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm font-medium">
                  {inquiryError}
                </div>
              )}

              {/* Buy Now / Cart for goods */}
              {isCartable && (
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={handleBuyNow} disabled={addingToCart}
                    className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                    <ShoppingBag size={18} /> Buy Now
                  </button>
                  {inCart ? (
                    <Link to="/cart"
                      className="flex items-center gap-2 py-3 px-4 rounded-xl border font-semibold text-sm transition-all
            border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                      <Check size={16} /> In Cart
                    </Link>
                  ) : (
                    <button onClick={handleAddToCart} disabled={addingToCart}
                      className="flex items-center gap-2 py-3 px-4 rounded-xl border font-semibold text-sm transition-all
            border-theme-border text-gray-600 dark:text-gray-300 hover:border-orange-300 hover:text-theme-primary disabled:opacity-50">
                      <ShoppingCart size={16} /> Add to Cart
                    </button>
                  )}
                </div>
              )}

              {/* Inquiry actions for flats and rentals */}
              {isFlatInquiry && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => sendPropertyInquiry({
                      titleLine: 'Book Now',
                      introLine: 'Hi, I want to book this flat. Please share the details and availability.',
                    })}
                    disabled={inquiryLoading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">
                    {inquiryLoading ? 'Sending Message…' : 'Book Now'}
                  </button>
                  <p className="text-[11px] text-theme-muted text-center mt-2">This sends the lister a message with this property link.</p>
                </div>
              )}

              {isRentInquiry && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => sendPropertyInquiry({
                      titleLine: 'Want to Rent',
                      introLine: 'Hi, I want to rent this property. Please share the rental details and availability.',
                    })}
                    disabled={inquiryLoading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">
                    {inquiryLoading ? 'Sending Message…' : 'Want to Rent'}
                  </button>
                  <p className="text-[11px] text-theme-muted text-center mt-2">This sends the lister a message with this property link.</p>
                </div>
              )}

              {/* Attributes */}
              {attributes && Object.keys(attributes).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-bold text-theme-text mb-3">Specifications</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(attributes).map(([key, value]) => !value ? null : (
                      <div key={key} className="p-3 glass-tag !rounded-xl flex flex-col !px-3 !py-3 !text-[10px]" style={{ backdropFilter: 'blur(8px)' }}>
                        <span className="text-[10px] text-theme-muted font-semibold uppercase tracking-wider">{key.replaceAll('_', ' ')}</span>
                        <span className="text-sm font-bold text-theme-text capitalize mt-0.5">{key === 'available_from' ? formatDate(value) : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-base font-bold text-theme-text mb-2">Description</h3>
                <p className="text-theme-muted text-sm leading-relaxed whitespace-pre-line">
                  {description || 'No description provided.'}
                </p>
              </div>

              {/* Seller Card */}
              <div className="mt-auto p-5 rounded-3xl glass-panel border-theme-primary/15" style={{ background: 'rgb(var(--theme-primary) / 0.06)', borderColor: 'rgb(var(--theme-primary) / 0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-900 border border-orange-100 dark:border-orange-900/30 flex items-center justify-center overflow-hidden">
                      {seller_avatar ? <img src={seller_avatar} className="w-full h-full object-cover" alt="" /> : <User size={24} className="text-theme-muted" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-theme-text flex items-center gap-1">
                        {seller_name}
                        {seller_verified === 1 && <ShieldCheck size={14} className="text-emerald-500" />}
                      </p>
                      <p className="text-[10px] text-theme-muted font-medium">Verified Seller</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isSeller ? (
                      <span className="px-4 py-2 bg-theme-primary/10 text-theme-primary border border-theme-primary/25 rounded-xl text-xs font-black tracking-tight uppercase">
                        Your Listing
                      </span>
                    ) : (
                      <>
                        {seller_phone && (
                          <a href={`tel:${seller_phone}`} className="p-2.5 rounded-xl bg-white dark:bg-gray-900 text-theme-muted hover:text-theme-primary transition-all border border-orange-100 dark:border-orange-900/20">
                            <Phone size={18} />
                          </a>
                        )}
                        <button onClick={handleMessage} className="px-4 py-2 bg-theme-primary text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                          Message
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 dark:bg-black/20 p-3 rounded-2xl">
                    <p className="text-[10px] text-theme-muted mb-1 uppercase tracking-wider font-bold">Email</p>
                    <p className="text-xs font-semibold text-theme-text truncate">{seller_email}</p>
                  </div>
                  <div className="bg-white/60 dark:bg-black/20 p-3 rounded-2xl">
                    <p className="text-[10px] text-theme-muted mb-1 uppercase tracking-wider font-bold">Member Since</p>
                    <p className="text-xs font-semibold text-theme-text">Jan 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Location Map ── */}
          <div className="mt-14 border-t border-theme-border pt-10">
            <h2 className="text-xl font-bold text-theme-text mb-6">Location</h2>
            <LocationMap location={location} lat={lat} lng={lng} />
          </div>

          {/* ── Reviews ── */}
          <div className="mt-14 border-t border-theme-border pt-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-theme-text">Buyer Reviews</h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-amber-500">{reviews.length ? avgRating.toFixed(1) : '0.0'}</span>
                <div className="text-xs text-theme-muted">
                  <div className="flex text-amber-400 mb-0.5">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < ratingStarsFilled ? '' : 'text-gray-200 dark:text-gray-700'}>★</span>
                    ))}
                  </div>
                  <div>Based on {reviews.length} reviews</div>
                </div>
              </div>
            </div>

            {positivePercent !== null && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/15 border border-emerald-500/10 dark:border-emerald-950/30 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={14} className="animate-pulse" /> AI Sentiment Analysis: {positivePercent}% Positive Customer Sentiment ({totalSentimentCount} classified)
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="text-center py-10 bg-theme-card rounded-3xl border border-dashed border-theme-border">
                <p className="text-theme-muted text-sm italic">No reviews yet for this listing.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                          {review.buyer_avatar ? <img src={review.buyer_avatar} className="w-full h-full object-cover" alt="" /> : <User size={20} className="m-auto mt-2 text-theme-muted" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-theme-text">{review.buyer_name}</p>
                          <p className="text-[10px] text-theme-muted">{formatDate(review.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex text-amber-400 text-sm">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < review.rating ? '' : 'text-gray-200 dark:text-gray-700'}>★</span>
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-theme-muted leading-relaxed bg-theme-bg/50 p-4 rounded-xl">
                        {review.comment}
                      </p>
                    )}
                    {review.sentiment_label && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                          review.sentiment_label === 'positive' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                            : review.sentiment_label === 'negative'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800'
                              : 'bg-theme-bg text-theme-muted border-theme-border'
                        }`}>
                          Sentiment: {review.sentiment_label} ({Math.round(review.sentiment_score * 100)}%)
                        </span>
                        {review.nlp_insights && review.nlp_insights.split(',').map((ins, idx) => ins.trim() && (
                          <span key={idx} className="text-[9px] font-bold bg-theme-primary/10 text-theme-primary px-2.5 py-1 rounded-xl">
                            ✨ {ins.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Related Listings ── */}
          {related && related.length > 0 && (
            <div className="mt-14">
              <h2 className="text-lg font-bold text-theme-text mb-4">Similar listings</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {related.map(r => (
                  <Link key={r.id} to={`/product/${r.id}`} className="card p-3 group">
                    <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2">
                      {r.main_image
                        ? <img src={r.main_image} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-theme-muted"><Package size={20} /></div>
                      }
                    </div>
                    <p className="text-xs font-semibold text-theme-text truncate">{r.title}</p>
                    <p className="text-xs font-bold text-theme-primary mt-0.5">৳{formatPrice(r.price)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Booking Modal ── */}
      {showBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 glass-overlay animate-fade-in" onClick={() => setShowBooking(false)}>
          <div className="glass-modal w-full max-w-md p-6 sm:p-8 relative animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowBooking(false)} className="absolute top-4 right-4 p-2 rounded-xl text-theme-muted hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all z-10">
              <X size={18} />
            </button>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarCheck size={28} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-theme-text">Book This Property</h3>
              <p className="text-xs text-theme-muted mt-1">Select advance amount to secure your booking</p>
            </div>
            <div className="bg-theme-bg rounded-2xl p-4 mb-5 border border-theme-border">
              <p className="text-sm font-bold text-theme-text line-clamp-1">{product.title}</p>
              <p className="text-xs text-theme-muted flex items-center gap-1 mt-1"><MapPin size={10} className="text-theme-primary" /> {product.location}</p>
              <p className="text-base font-black text-rose-500 mt-1.5">৳{formatPrice(product.price)} <span className="text-xs font-semibold text-theme-muted">/month</span></p>
            </div>
            <div className="mb-5">
              <label htmlFor="booking-amount" className="block text-sm font-semibold text-theme-text mb-3">Select Advance Amount</label>
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                {[1000, 2000, 5000].map(amt => (
                  <button key={amt} type="button" onClick={() => { setBookingAmount(amt); setCustomAmount(''); setBookingError('') }}
                    className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${bookingAmount === amt ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'border-theme-border text-theme-muted hover:border-emerald-300 hover:text-emerald-600'}`}>
                    ৳{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="relative">
                <button type="button" onClick={() => { setBookingAmount('custom'); setBookingError('') }}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${bookingAmount === 'custom' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-theme-border'}`}>
                  <span className="text-theme-muted text-xs font-semibold">Other Amount</span>
                </button>
                {bookingAmount === 'custom' && (
                  <div className="mt-2 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted font-bold text-sm">৳</span>
                    <input type="number" min="500" value={customAmount} onChange={e => { setCustomAmount(e.target.value); setBookingError('') }}
                      placeholder="Min 500"
                      className="w-full bg-theme-bg border border-theme-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-theme-text placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 dark:focus:ring-emerald-900/40 transition-all" />
                  </div>
                )}
              </div>
            </div>
            <div className="mb-5">
              <label htmlFor="booking-phone" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Phone Number <span className="text-red-400">*</span></label>
              <input id="booking-phone" type="tel" value={bookingPhone} onChange={e => { setBookingPhone(e.target.value); setBookingError('') }}
                placeholder="01XXXXXXXXX"
                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 dark:focus:ring-emerald-900/40 transition-all" />
            </div>
            <div className="mb-5">
              <label htmlFor="booking-note" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Note (optional)</label>
              <input id="booking-note" type="text" value={bookingNote} onChange={e => setBookingNote(e.target.value)}
                placeholder="Move-in date, special requests..."
                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 dark:focus:ring-emerald-900/40 transition-all" />
            </div>
            {bookingError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-xs font-medium">
                {bookingError}
              </div>
            )}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 mb-4 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-theme-muted">Advance Amount</span>
                <span className="font-bold text-theme-text">৳{formatPrice(getSelectedBookingAmount())}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-theme-muted">Delivery Fee</span>
                <span className="font-semibold text-emerald-600">Free</span>
              </div>
              <div className="h-px bg-emerald-100 dark:bg-emerald-900/30 my-2" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-theme-text">Total</span>
                <span className="text-rose-500">৳{formatPrice(getSelectedBookingAmount())}</span>
              </div>
            </div>
            <button type="button" onClick={handleConfirmBooking} disabled={bookingLoading || !bookingAmount}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
              {bookingLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
              ) : (
                <><CalendarCheck size={18} /> Confirm Booking — ৳{formatPrice(getSelectedBookingAmount())}</>
              )}
            </button>
            <p className="text-[10px] text-theme-muted text-center mt-3">By confirming, you agree to the advance booking terms</p>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}