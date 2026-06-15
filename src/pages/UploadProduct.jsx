import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
 ArrowLeft, Home as HomeIcon, ShoppingBag, Sofa,
 Package, Tv, MapPin, Tag, CheckCircle, Image as ImageIcon, X,
 Calendar as CalendarIcon, ChevronLeft, ChevronRight, Navigation
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { uploadProduct } from '../services/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet'
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

const CATEGORIES = [
 { id: 'house_sell', label: 'House for Sale', icon: HomeIcon,  desc: 'Sell your property directly to verified buyers.' },
 { id: 'house_rent', label: 'House for Rent', icon: Tag,     desc: 'Find the perfect tenants for your flat or house.' },
 { id: 'furniture', label: 'Furniture',   icon: Sofa,    desc: 'New or used furniture for home and office.' },
 { id: 'appliance', label: 'Home Appliance', icon: Package,   desc: 'Sell TVs, fridges, washing machines etc.' },
]

function GlassDatePicker({ value, onChange }) {
 const [isOpen, setIsOpen] = useState(false)
 const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date())
 const popoverRef = useRef(null)

 useEffect(() => {
  const handleClickOutside = (e) => {
   if (popoverRef.current && !popoverRef.current.contains(e.target)) setIsOpen(false)
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
 }, [])

 const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
 const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
 const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
 const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i)

 const handleDateSelect = (day) => {
  const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  onChange(`${yyyy}-${mm}-${dd}`)
  setIsOpen(false)
 }

 const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
 const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))

 return (
  <div className="relative w-full" ref={popoverRef}>
   <button type="button" onClick={() => setIsOpen(!isOpen)}
    className="w-full bg-theme-bg border border-theme-border text-theme-text rounded-xl px-4 py-3 flex items-center justify-between focus:outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all text-sm h-[46px] hover:border-theme-primary/50">
    <span className={value ? "text-theme-text font-medium" : "text-theme-muted"}>
     {value ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select Date'}
    </span>
    <CalendarIcon size={16} className="text-theme-muted" />
   </button>

   {isOpen && (
    <div className="absolute z-50 top-full left-0 mt-2 p-5 w-[280px] sm:w-[300px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-800/60 rounded-3xl shadow-2xl animate-scale-in origin-top">
     <div className="flex items-center justify-between mb-5">
      <button type="button" onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-theme-text transition-colors shadow-sm"><ChevronLeft size={16} /></button>
      <span className="font-bold text-sm text-theme-text">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
      <button type="button" onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-theme-text transition-colors shadow-sm"><ChevronRight size={16} /></button>
     </div>
     <div className="grid grid-cols-7 gap-1 mb-3">
      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
       <div key={d} className="text-center text-[10px] font-bold text-theme-muted uppercase tracking-wider">{d}</div>
      ))}
     </div>
     <div className="grid grid-cols-7 gap-1">
      {blanks.map(b => <div key={`blank-${b}`} className="h-9" />)}
      {days.map(d => {
       const isSelected = value && new Date(value).getDate() === d && new Date(value).getMonth() === currentMonth.getMonth() && new Date(value).getFullYear() === currentMonth.getFullYear()
       
       const today = new Date()
       today.setHours(0, 0, 0, 0)
       const currentDateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
       currentDateObj.setHours(0, 0, 0, 0)
       
       const isPast = currentDateObj < today
       const isToday = currentDateObj.getTime() === today.getTime()

       return (
        <button key={d} type="button" onClick={() => !isPast && handleDateSelect(d)} disabled={isPast}
         className={`h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-200
          ${isPast ? 'opacity-30 cursor-not-allowed text-theme-muted font-medium'
            : isSelected ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105' 
            : isToday ? 'bg-gray-200 dark:bg-gray-800 text-theme-text ring-1 ring-inset ring-gray-300 dark:ring-gray-600' 
            : 'text-theme-text hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-500 hover:scale-110'}`}>
         {d}
        </button>
       )
      })}
     </div>
    </div>
   )}
  </div>
 )
}

function useLocationMap(locationText, onLocationChange) {
  const [showMap, setShowMap] = useState(false);
  const [position, setPosition] = useState([23.8103, 90.4125]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  const toggleMap = () => {
    setShowMap(!showMap);
    if (!showMap && locationText) geocodeText(locationText);
  };

  const geocodeText = (text) => {
    if (!text.trim()) return;
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const newPos = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          setPosition(newPos);
          if (mapRef.current) mapRef.current.flyTo(newPos, 15);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleBlur = () => {
    if (showMap && locationText) geocodeText(locationText);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          if (mapRef.current) mapRef.current.flyTo(newPos, 15);
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos[0]}&lon=${newPos[1]}`)
            .then(res => res.json())
            .then(data => {
              if (data && data.address) {
                let parts = [];
                if (data.address.amenity) parts.push(data.address.amenity);
                if (data.address.road) parts.push(data.address.road);
                if (data.address.suburb) parts.push(data.address.suburb);
                else if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
                if (data.address.city) parts.push(data.address.city);
                
                let preciseName = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(', ');
                onLocationChange(preciseName);
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
        },
        (err) => {
          console.error(err);
          setLoading(false);
          alert("Could not get current location. Please check permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return { showMap, position, setPosition, loading, setLoading, mapRef, toggleMap, handleBlur, getCurrentLocation };
}

const MapClickEvents = ({ setPosition, setLoading, onLocationChange }) => {
  useMapEvents({
    click(e) {
      const newPos = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      setLoading(true);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos[0]}&lon=${newPos[1]}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            let parts = [];
            if (data.address.amenity) parts.push(data.address.amenity);
            if (data.address.road) parts.push(data.address.road);
            if (data.address.suburb) parts.push(data.address.suburb);
            else if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
            if (data.address.city) parts.push(data.address.city);
            
            let preciseName = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(', ');
            onLocationChange(preciseName);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  });
  return null;
};

export default function UploadProduct() {
 const { user, loading: authLoading } = useAuth()
 const navigate = useNavigate()

 const [step, setStep] = useState(1)
 
 // Data State
 const [category, setCategory] = useState('')
 const [form, setForm] = useState({
  title: '', description: '', price: '', location: ''
 })
 const [attributes, setAttributes] = useState({})
 
 // Image State (base64)
 const [images, setImages] = useState([]) // array of data URLs
 
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [success, setSuccess] = useState(false)

 const { showMap, position, setPosition, loading: mapLoading, setLoading: setMapLoading, mapRef, toggleMap, handleBlur, getCurrentLocation } = useLocationMap(form.location, (loc) => setForm({...form, location: loc}));

 // If not logged in, redirect
 if (authLoading) return null
 if (!user) {
  if (typeof window !== 'undefined') window.location.href = '/login'
  return null
 }
 if (user.role !== 'seller') {
  if (typeof window !== 'undefined') window.location.href = '/'
  return null
 }
 if (!user.nid_verified) {
  if (typeof window !== 'undefined') window.location.href = '/verify-nid'
  return null
 }

 const handleNext = () => {
  if (step === 1 && !category) return setError('Please select a category.')
  setError('')
  setStep(s => s + 1)
 }
 const handlePrev = () => {
  setError('')
  setStep(s => s - 1)
 }

 const handleImageUpload = (e) => {
  const files = Array.from(e.target.files)
  if (images.length + files.length > 5) {
   return setError('You can upload a maximum of 5 images.')
  }
  setError('')
  
  files.forEach(file => {
   const reader = new FileReader()
   reader.onload = ev => setImages(prev => [...prev, ev.target.result])
   reader.readAsDataURL(file)
  })
 }

 const removeImage = (index) => {
  setImages(prev => prev.filter((_, i) => i !== index))
 }

 const handleSubmit = async (e) => {
  e.preventDefault()
  if (!form.title || !form.price || !form.location) {
   return setError('Please fill in all required fields.')
  }
  if (images.length === 0) {
   return setError('Please upload at least one image.')
  }

  setLoading(true)
  setError('')
  try {
   await uploadProduct({
    category,
    title: form.title,
    description: form.description,
    price: parseFloat(form.price),
    location: form.location,
    lat: position[0],
    lng: position[1],
    attributes,
    images_base64: images
   })
   setSuccess(true)
   setTimeout(() => {
    navigate('/profile', { replace: true })
   }, 2000)
  } catch (err) {
   setError(err.message || 'Failed to upload product.')
   setLoading(false)
  }
 }

 return (
  <>
   <Navbar />
   {success && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 glass-overlay">
     <div className="absolute inset-0 animate-fade-in" />
     <div className="glass-modal p-8 max-w-sm w-full text-center shadow-2xl animate-modal-in border border-emerald-100 dark:border-emerald-900/30 relative z-10">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
       <CheckCircle size={40} className="text-emerald-500" />
      </div>
      <h3 className="text-2xl font-bold text-theme-text mb-2">Upload Successful!</h3>
      <p className="text-theme-muted">Your product has been submitted and is pending admin review.</p>
     </div>
    </div>
   )}
   <main className="min-h-screen bg-theme-bg pt-20 pb-12">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 animate-fade-in">
     
     <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
       <Link to="/profile" className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-white dark:hover:bg-gray-900 border border-transparent transition-all">
        <ArrowLeft size={18} />
       </Link>
       <h1 className="text-xl font-bold text-theme-text">Upload New Product</h1>
      </div>
      <div className="text-sm font-medium text-theme-muted">Step {step} of 3</div>
     </div>

     <div className="glass-card overflow-visible relative">
      
      {/* Content Area */}
      <div className="p-6 sm:p-10">
       {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm flex items-center gap-2 font-medium">
         <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" /> {error}
        </div>
       )}

       {/* STEP 1: CATEGORY */}
       {step === 1 && (
        <div className="animate-fade-in">
         <h2 className="text-lg font-bold text-theme-text mb-2">What are you listing?</h2>
         <p className="text-theme-muted text-sm mb-6">Choose the category that best fits your product.</p>
         
         <div className="grid sm:grid-cols-2 gap-4">
          {CATEGORIES.map(cat => {
           const isSelected = category === cat.id
           return (
            <button key={cat.id} onClick={() => { setCategory(cat.id); setError(''); }}
             className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4
              ${isSelected 
               ? 'border-theme-primary bg-theme-primary/10/50 dark:bg-orange-950/20 shadow-sm' 
               : 'border-theme-border hover:border-theme-primary/30 dark:hover:border-orange-900'
              }`}
            >
             <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
              ${isSelected ? 'bg-theme-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-theme-muted'}`}>
              <cat.icon size={20} />
             </div>
             <div>
              <h3 className={`font-bold text-base mb-1 ${isSelected ? 'text-orange-700 dark:text-orange-400' : 'text-theme-text'}`}>{cat.label}</h3>
              <p className="text-sm text-theme-muted leading-relaxed">{cat.desc}</p>
             </div>
            </button>
           )
          })}
         </div>
        </div>
       )}

       {/* STEP 2: DETAILS */}
       {step === 2 && (
        <div className="animate-fade-in">
         <h2 className="text-lg font-bold text-theme-text mb-6">Basic Information</h2>
         
         <div className="space-y-5">
          <div>
           <label htmlFor="uploadproduct-input-1" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Listing Title <span className="text-red-500">*</span></label>
           <input id="uploadproduct-input-1" type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            placeholder="e.g., Luxury Sofa Set / 3BHK Flat" className="input-field" />
          </div>

           <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div>
             <label htmlFor="uploadproduct-input-2" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Price (BDT) <span className="text-red-500">*</span></label>
             <input id="uploadproduct-input-2" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
              placeholder="e.g., 15000" className="input-field" />
            </div>
            <div>
             <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location <span className="text-red-500">*</span></label>
             <div className="relative flex items-center">
              <input 
               type="text" 
               value={form.location} 
               onChange={e => setForm({...form, location: e.target.value})}
               onBlur={handleBlur}
               placeholder="e.g., United International University, Dhaka" 
               className="input-field pr-12" 
              />
              <button 
               type="button" 
               onClick={toggleMap}
               className={`absolute right-2 p-2 rounded-lg transition-colors ${showMap ? 'text-theme-primary bg-theme-primary/10' : 'text-theme-muted hover:bg-gray-100 dark:hover:bg-gray-800'}`}
               title="Pin on Map"
              >
               <MapPin size={18} />
              </button>
             </div>
            </div>
           </div>

           {/* Full Width Map Rendering */}
           {showMap && (
            <div className="h-72 w-full rounded-2xl overflow-hidden border border-theme-border shadow-sm relative z-0 mb-5 animate-slide-up">
             {mapLoading && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center glass-overlay rounded-2xl">
               <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
              </div>
             )}
             <MapContainer center={position} zoom={15} ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer
               attribution='&copy; OpenStreetMap'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickEvents setPosition={setPosition} setLoading={setMapLoading} onLocationChange={(loc) => setForm({...form, location: loc})} />
              <Marker position={position}>
               <Popup>Selected Location</Popup>
              </Marker>
             </MapContainer>
             
             {/* Get Current Location Button */}
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
              <button 
               type="button" 
               onClick={getCurrentLocation}
               className="btn-primary shadow-xl scale-95 hover:scale-100 transition-transform py-2 px-4 rounded-xl text-sm whitespace-nowrap"
              >
               <Navigation size={16} /> Use My Current Location
              </button>
             </div>
            </div>
           )}

           <div>
           <label htmlFor="uploadproduct-input-3" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
           <textarea id="uploadproduct-input-3" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            rows={4} placeholder="Describe your item in detail..." className="input-field resize-none" />
          </div>

          {/* DYNAMIC ATTRIBUTES */}
          <div className="pt-4 border-t border-theme-border">
           <h3 className="text-sm font-bold text-theme-text mb-4">Specific Details</h3>
           
           {(category === 'house_sell' || category === 'house_rent') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
             <div>
              <label htmlFor="uploadproduct-input-4" className="block text-xs font-medium text-theme-muted mb-1">Beds</label>
              <input id="uploadproduct-input-4" type="number" min="0" value={attributes.beds || ''} onChange={e => setAttributes({...attributes, beds: e.target.value})} className="input-field" />
             </div>
             <div>
              <label htmlFor="uploadproduct-input-5" className="block text-xs font-medium text-theme-muted mb-1">Baths</label>
              <input id="uploadproduct-input-5" type="number" min="0" value={attributes.baths || ''} onChange={e => setAttributes({...attributes, baths: e.target.value})} className="input-field" />
             </div>
             <div>
              <label htmlFor="uploadproduct-input-6" className="block text-xs font-medium text-theme-muted mb-1">Size (sqft)</label>
              <input id="uploadproduct-input-6" type="number" min="0" value={attributes.sqft || ''} onChange={e => setAttributes({...attributes, sqft: e.target.value})} className="input-field" />
             </div>
             {category === 'house_rent' && (
              <>
               <div>
                <label htmlFor="uploadproduct-input-7" className="block text-xs font-medium text-theme-muted mb-1">Available For</label>
                <select id="uploadproduct-input-7" value={attributes.available_for || ''} onChange={e => setAttributes({...attributes, available_for: e.target.value})} className="input-field text-sm">
                 <option value="">Any</option>
                 <option value="Family">Family</option>
                 <option value="Bachelor">Bachelor</option>
                </select>
               </div>
               <div>
                <label className="block text-xs font-medium text-theme-muted mb-1">Available From</label>
                <GlassDatePicker 
                 value={attributes.available_from || ''} 
                 onChange={val => setAttributes({...attributes, available_from: val})} 
                />
               </div>
              </>
             )}
            </div>
           )}

           {(category === 'furniture' || category === 'appliance') && (
            <div className="w-full sm:w-1/2">
             <label htmlFor="uploadproduct-input-8" className="block text-xs font-medium text-theme-muted mb-1">Condition</label>
             <select id="uploadproduct-input-8" value={attributes.condition || ''} onChange={e => setAttributes({...attributes, condition: e.target.value})} className="input-field">
              <option value="">Select condition</option>
              <option value="New">New</option>
              <option value="Used">Used</option>
             </select>
            </div>
           )}
          </div>

         </div>
        </div>
       )}

       {/* STEP 3: IMAGES */}
       {step === 3 && (
        <div className="animate-fade-in">
         <h2 className="text-lg font-bold text-theme-text mb-2">Upload Photos</h2>
         <p className="text-theme-muted text-sm mb-6">Upload up to 5 clear photos. The first photo will be the main cover.</p>
         
         <label className="w-full h-40 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-theme-bg hover:bg-theme-primary/10/50 dark:bg-gray-800/30 dark:hover:bg-orange-950/10 flex flex-col items-center justify-center cursor-pointer transition-colors group mb-6">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
           <ImageIcon size={20} className="text-theme-muted group-hover:text-theme-primary transition-colors" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload photos</p>
          <p className="text-xs text-theme-muted mt-1">JPEG, PNG, WEBP (Max 5)</p>
          <input type="file" multiple accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleImageUpload} />
         </label>

         {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
           {images.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm bg-gray-100 dark:bg-gray-800">
             <img src={img} alt="Preview" className="w-full h-full object-cover" />
             <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
              <X size={12} />
             </button>
             {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-theme-primary/90 text-white text-[10px] font-bold text-center py-0.5">COVER</span>
             )}
            </div>
           ))}
          </div>
         )}
        </div>
       )}
      </div>

      {/* Actions Footer */}
      <div className="px-6 py-4 bg-theme-bg dark:bg-gray-800/50 border-t border-theme-border flex items-center justify-between rounded-b-3xl">
       {step > 1 ? (
        <button type="button" onClick={handlePrev} disabled={loading}
         className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
         Back
        </button>
       ) : <div />}
       
       {step < 3 ? (
        <button type="button" onClick={handleNext}
         className="btn-primary py-2.5 px-6 rounded-xl">
         Continue
        </button>
       ) : (
        <button type="button" onClick={handleSubmit} disabled={loading || images.length === 0}
         className="btn-primary py-2.5 px-6 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
         {loading ? 'Uploading...' : <><CheckCircle size={18} /> Submit for Review</>}
        </button>
       )}
      </div>
      
     </div>
    </div>
   </main>
   <Footer />
  </>
 )
}
