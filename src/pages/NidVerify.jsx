import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Image as ImageIcon, Camera, CheckCircle, Info, AlertCircle, Check, X, FileSearch, ScanFace, Gauge, LockKeyhole, RefreshCw } from 'lucide-react'
import { getNidStatus, submitNid } from '../services/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

export default function NidVerify() {
 const navigate = useNavigate()
 const location = useLocation()
 const { refreshUser, user } = useAuth()
 
 // Get reason from URL query
 const query = new URLSearchParams(location.search)
 const reason = query.get('reason')

 const [frontPreview, setFrontPreview] = useState('')
 const [selfiePreview, setSelfiePreview] = useState('')
 
 const [frontBase64, setFrontBase64] = useState('')
 const [selfieBase64, setSelfieBase64] = useState('')
 
 const [loading, setLoading] = useState(false)
 const [uploadProgress, setUploadProgress] = useState(0)
 const [submission, setSubmission] = useState(null)
 const [error, setError] = useState('')
 const [showDialog, setShowDialog] = useState(false)
 const [dialogType, setDialogType] = useState('') // 'success' or 'error'

 useEffect(() => {
  if (!user) { navigate('/login'); return }
  if (user.nid_verified) { navigate('/profile'); return }
 }, [user, navigate])

 useEffect(() => {
  if (!user || user.nid_verified) return
  getNidStatus()
   .then(data => setSubmission(data.submission || null))
   .catch(() => {})
 }, [user])

 // Poll for status updates while processing or pending admin review
 useEffect(() => {
  if (!submission || !['pending', 'processing', 'review'].includes(submission.status)) return

  const pollInterval = setInterval(() => {
   getNidStatus()
    .then(data => setSubmission(data.submission || null))
    .catch(() => {})
  }, 5000) // Poll every 5 seconds

  return () => clearInterval(pollInterval)
 }, [submission?.status])

 const handleImageChange = (e, setPreview, setBase64) => {
  const file = e.target.files[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
   setError('Only JPG, PNG, or WEBP images are supported.')
   return
  }
  if (file.size > 5 * 1024 * 1024) {
   setError('Each image must be 5MB or smaller.')
   return
  }
  const reader = new FileReader()
  reader.onprogress = ev => {
   if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
  }
  reader.onload = ev => {
   setPreview(ev.target.result)
   setBase64(ev.target.result)
   setUploadProgress(100)
  }
  reader.readAsDataURL(file)
 }

 const handleSubmit = async e => {
  e.preventDefault()
  if (!frontBase64 || !selfieBase64) {
   setError('Please upload both required images. The NID number will be extracted automatically.')
   return
  }

  setLoading(true)
  setError('')
  try {
   const data = await submitNid({
    nid_front_base64: frontBase64,
    nid_selfie_base64: selfieBase64
   })
   setSubmission(data.submission || null)
   await refreshUser()
   setDialogType('success')
   setShowDialog(true)
  } catch (err) {
   setDialogType('error')
   setShowDialog(true)
   setError(err.message || 'Failed to submit NID. Please try again.')
  } finally {
   setLoading(false)
  }
 }

 // Dynamic requirement message
 const getRequirementMessage = () => {
  switch (reason) {
   case 'chat':
    return 'Identity Verification Required: Please verify your NID to start messaging sellers.'
   case 'buy':
    return 'Identity Verification Required: Please verify your NID to complete this purchase.'
   case 'cart':
    return 'Identity Verification Required: Please verify your NID to add items to your cart.'
   default:
    return 'Verify your NID to unlock premium features and build trust in the community.'
  }
 }

 return (
  <>
   <Navbar />
   <main className="min-h-screen bg-theme-bg pt-16 pb-12">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 animate-fade-in">
     
      <div className="mb-6 flex items-center gap-3">
      <Link to="/profile"
       className="p-2 rounded-lg text-theme-muted hover:text-theme-primary
        hover:bg-white dark:hover:bg-gray-900 border border-transparent
        hover:border-theme-border dark:hover:border-gray-800 transition-all duration-200">
       <ArrowLeft size={18} />
      </Link>
       <div>
        <h1 className="text-2xl font-black text-theme-text">AI-assisted identity verification</h1>
        <p className="text-xs text-theme-muted mt-1">Bangladesh NID OCR, face comparison, fraud checks, and admin fallback.</p>
       </div>
      </div>

     {reason && (
       <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 flex items-center gap-3 text-rose-600 dark:text-rose-400">
         <Info size={20} className="flex-shrink-0" />
         <p className="text-sm font-bold">{getRequirementMessage()}</p>
       </div>
     )}

      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5 items-start">
       <aside className="space-y-4">
        <div className="glass-panel p-5">
         <p className="text-xs uppercase font-black text-theme-primary mb-3">Automated checks</p>
         <div className="space-y-3">
          <CheckStep icon={<FileSearch size={16} />} title="Document OCR" text="Detects Bangladesh NID layout, readable text, NID number, name, and date of birth." />
          <CheckStep icon={<ScanFace size={16} />} title="Face match" text="Compares the selfie with the face visible on the NID image." />
            <CheckStep icon={<Gauge size={16} />} title="Confidence score" text=">70 can auto approve, 50-70 goes to admin review, under 50 is rejected." />
          <CheckStep icon={<LockKeyhole size={16} />} title="Secure storage" text="Images are stored outside public uploads and reviewed through protected admin access." />
         </div>
        </div>

        <div className="glass-panel p-5">
         <p className="text-sm font-bold text-theme-text mb-3">Photo checklist</p>
         <ul className="space-y-2 text-xs text-theme-muted">
          <li>Use the original front side of a Bangladesh NID.</li>
          <li>Keep the NID flat, uncropped, and readable.</li>
          <li>Upload a clear selfie with one human face visible.</li>
          <li>Avoid screenshots, edited images, memes, and blurred photos.</li>
         </ul>
        </div>
       </aside>

      <div className="glass-panel p-6 sm:p-8">
      
       <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-theme-primary/10 dark:bg-orange-950/20 text-theme-primary-hover dark:text-orange-400 border border-theme-primary/30 dark:border-orange-900">
       <ShieldAlert size={24} className="flex-shrink-0" />
       <p className="text-sm">
        <strong>Why verify?</strong> Verified users get a badge, more trust from others, and access to premium features. 
         Your submission is checked automatically first. Admins only step in when the confidence score needs review.
        </p>
       </div>

      {submission && (
       <div className="mb-6 rounded-xl border border-theme-border bg-theme-bg p-4">
        <div className="flex items-center justify-between gap-3">
         <div>
          <p className="text-sm font-bold text-theme-text">Current verification status</p>
          <p className="text-xs text-theme-muted mt-1">
           {submission.status === 'approved'
            ? 'Approved automatically or by admin.'
            : submission.status === 'rejected'
             ? (submission.review_note || 'Rejected by verification checks. You can retry with clearer images.')
             : 'Automated checks are processing. Admin review starts if confidence is not high enough.'}
          </p>
         </div>
         <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full border border-theme-border text-theme-muted">
           {submission.verification_status || submission.status}
          </span>
          {['pending', 'processing', 'review'].includes(submission.status) && (
           <RefreshCw size={14} className="animate-spin text-theme-primary opacity-75" />
          )}
         </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
         <Metric label="OCR" value={submission.ocr_confidence ?? 0} />
         <Metric label="Face" value={submission.face_match_score ?? 0} />
         <Metric label="Score" value={submission.confidence_score ?? 0} />
        </div>
        {!!submission.fraud_flags?.length && (
         <div className="mt-3 flex flex-wrap gap-1.5">
          {submission.fraud_flags.map(flag => (
           <span key={flag} className="text-[10px] font-semibold rounded-full bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5">{flag.replaceAll('_', ' ')}</span>
          ))}
         </div>
        )}
       </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
       {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800
         rounded-xl text-red-600 text-sm text-center">
         {error}
        </div>
       )}

       {/* NID Front Upload */}
       <div>
        <label className="block text-sm font-bold text-theme-text dark:text-gray-200 mb-2">
         1. Clear photo of NID (Front side)
        </label>
        <UploadBox 
         id="nid-front"
         preview={frontPreview}
         onChange={e => handleImageChange(e, setFrontPreview, setFrontBase64)}
         icon={<ImageIcon size={32} />}
         label="Upload NID Front"
         progress={uploadProgress}
        />
       </div>

       {/* Selfie Upload */}
       <div>
        <label className="block text-sm font-bold text-theme-text dark:text-gray-200 mb-2">
         2. Selfie of the person
        </label>
        <UploadBox 
         id="nid-selfie"
         preview={selfiePreview}
         onChange={e => handleImageChange(e, setSelfiePreview, setSelfieBase64)}
         icon={<Camera size={32} />}
         label="Upload Selfie"
         progress={uploadProgress}
        />
       </div>

       {/* Submit */}
       <button 
        type="submit" 
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-theme-primary text-white font-bold
         hover:bg-orange-600 active:scale-[0.98] transition-all
         disabled:opacity-70 disabled:cursor-not-allowed
         flex justify-center items-center gap-2"
       >
        {loading ? (
         <>
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Submitting...
         </>
        ) : (
         <>
          <CheckCircle size={18} />
          Start automated verification
         </>
        )}
       </button>
      </form>
     </div>
    </div>
    </div>

    {showDialog && (
     <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-theme-card rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-theme-border animate-scale-in">
       {dialogType === 'success' ? (
        <>
         <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center animate-bounce">
           <Check size={32} className="text-emerald-500" />
          </div>
         </div>
         <h3 className="text-center text-xl font-bold text-theme-text mb-2">Request Submitted Successfully!</h3>
         <p className="text-center text-sm text-theme-muted mb-4">Your verification is processing automatically. If confidence is not high enough, it will move to admin review.</p>
         <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 mb-6 font-medium">Secure and Confidential</p>
         <button onClick={() => { setShowDialog(false); navigate('/profile', { replace: true }) }} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all active:scale-95">Back to Profile</button>
        </>
       ) : (
        <>
         <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center"><AlertCircle size={32} className="text-red-500" /></div>
         </div>
         <h3 className="text-center text-xl font-bold text-theme-text mb-2">Submission Failed</h3>
         <p className="text-center text-sm text-theme-muted mb-4">{error || 'Try again.'}</p>
         <div className="space-y-2 flex flex-col gap-2">
          <button onClick={() => setShowDialog(false)} className="w-full py-3 rounded-xl bg-theme-primary hover:bg-orange-600 text-white font-bold transition-all active:scale-95">Try Again</button>
          <button onClick={() => { setShowDialog(false); navigate('/profile', { replace: true }) }} className="w-full py-3 rounded-xl border border-theme-border text-theme-text hover:bg-theme-bg transition-all active:scale-95">Back to Profile</button>
         </div>
        </>
       )}
      </div>
     </div>
    )}
   </main>
   <Footer />
  </>
 )
}

function CheckStep({ icon, title, text }) {
 return (
  <div className="flex gap-3 rounded-lg border border-theme-border bg-theme-bg p-3">
   <div className="mt-0.5 text-theme-primary">{icon}</div>
   <div>
    <p className="text-sm font-bold text-theme-text">{title}</p>
    <p className="text-xs leading-5 text-theme-muted mt-0.5">{text}</p>
   </div>
  </div>
 )
}

function Metric({ label, value }) {
 return (
  <div className="rounded-lg border border-theme-border bg-theme-card p-2">
   <p className="text-sm font-black text-theme-text">{Math.round(Number(value) || 0)}</p>
   <p className="text-[10px] uppercase font-bold text-theme-muted">{label}</p>
  </div>
 )
}

function UploadBox({ id, preview, onChange, icon, label, progress }) {
 return (
  <label htmlFor={id} className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
   preview 
    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10' 
    : 'border-theme-border bg-theme-bg dark:bg-gray-800/50 hover:border-theme-primary/50 dark:hover:border-orange-600 hover:bg-theme-primary/10 dark:hover:bg-orange-950/20'
  }`}>
   {preview ? (
    <div className="relative w-full h-full p-2 group">
     <img src={preview} alt="Upload preview" className="w-full h-full object-contain rounded-lg" />
     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white font-medium text-sm">
      Click to change image
     </div>
    </div>
   ) : (
    <div className="text-theme-muted flex flex-col items-center">
     {icon}
     <p className="mt-2 font-medium text-sm">{label}</p>
     <p className="text-xs mt-1 text-theme-muted">JPG, PNG, WEBP (Max 5MB)</p>
     {progress > 0 && progress < 100 && <p className="text-xs mt-1 text-theme-primary">{progress}%</p>}
    </div>
   )}
   <input 
    id={id}
    type="file" 
    accept="image/jpeg, image/png, image/webp" 
    className="hidden" 
    onChange={onChange} 
   />
  </label>
 )
}
