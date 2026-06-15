import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react'
import { verifyEmail as verifyEmailApi, resendOtp } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function VerifyEmail() {
 const navigate   = useNavigate()
 const auth     = useAuth()
 const [params]   = useSearchParams()
 const emailParam  = params.get('email') || ''

 const [email, setEmail]     = useState(emailParam)
 const [otp, setOtp]       = useState(['', '', '', '', '', ''])
 const [loading, setLoading]   = useState(false)
 const [resending, setResending] = useState(false)
 const [error, setError]     = useState('')
 const [success, setSuccess]   = useState(false)
 const [resendMsg, setResendMsg] = useState('')
 const [cooldown, setCooldown]  = useState(0)
 const inputRefs = useRef([])

 // Countdown timer for resend
 useEffect(() => {
  if (cooldown <= 0) return
  const t = setTimeout(() => setCooldown(c => c - 1), 1000)
  return () => clearTimeout(t)
 }, [cooldown])

 const handleOtpChange = (index, value) => {
  const cleaned = value.replace(/\D/g, '').slice(-1)
  const next = [...otp]
  next[index] = cleaned
  setOtp(next)
  setError('')
  if (cleaned && index < 5) inputRefs.current[index + 1]?.focus()
 }

 const handleKeyDown = (index, e) => {
  if (e.key === 'Backspace' && !otp[index] && index > 0) {
   inputRefs.current[index - 1]?.focus()
  }
 }

 const handlePaste = (e) => {
  const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
  if (text.length === 6) {
   setOtp(text.split(''))
   inputRefs.current[5]?.focus()
  }
  e.preventDefault()
 }

 const handleSubmit = async (e) => {
  e.preventDefault()
  const code = otp.join('')
  if (code.length < 6) { setError('Please enter all 6 digits.'); return }
  if (!email) { setError('Email is required.'); return }

  setLoading(true)
  setError('')
  try {
   const data = await verifyEmailApi({ email, otp: code })
   auth.login(data.user)
   setSuccess(true)
   setTimeout(() => navigate('/'), 1500)
  } catch (err) {
   setError(err.message || 'Verification failed. Please try again.')
  } finally {
   setLoading(false)
  }
 }

 const handleResend = async () => {
  if (!email || cooldown > 0) return
  setResending(true)
  setResendMsg('')
  setError('')
  try {
   await resendOtp(email)
   setResendMsg('A new code has been sent!')
   setCooldown(60)
  } catch (err) {
   setError(err.message || 'Failed to resend code.')
  } finally {
   setResending(false)
  }
 }

 if (success) {
  return (
   <div className="min-h-screen flex items-center justify-center bg-theme-bg">
    <div className="text-center animate-slide-up">
     <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-5">
      <ShieldCheck size={38} className="text-emerald-500" />
     </div>
     <h2 className="text-2xl font-bold text-theme-text mb-2">Email Verified!</h2>
     <p className="text-theme-muted text-sm">Welcome to Thikana. Redirecting you home…</p>
    </div>
   </div>
  )
 }

 return (
  <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4 py-8 transition-colors duration-200">
   <div className="w-full max-w-md animate-slide-up">

    <div className="text-center mb-6">
     <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
      <Logo size={36} />
      <span className="text-xl font-extrabold text-theme-text">Thikana</span>
     </Link>
     <div className="w-14 h-14 bg-theme-primary/20 dark:bg-orange-950/40 border border-theme-primary/30 dark:border-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Mail size={26} className="text-theme-primary" />
     </div>
     <h1 className="text-2xl font-black text-theme-text">Check your email</h1>
     <p className="text-theme-muted text-sm mt-2 max-w-xs mx-auto leading-relaxed">
      We sent a 6-digit verification code to
      {email && <strong className="text-gray-700 dark:text-gray-300 block mt-0.5">{email}</strong>}
     </p>
    </div>

    <div className="bg-theme-card border border-theme-border rounded-2xl shadow-sm p-7">
     {error && (
      <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm text-center">
       {error}
      </div>
     )}
     {resendMsg && (
      <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 text-sm text-center">
       {resendMsg}
      </div>
     )}

     {!emailParam && (
      <div className="mb-4">
       <label htmlFor="verifyemail-input-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Email</label>
       <input id="verifyemail-input-1" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-field" />
      </div>
     )}

     <form onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">Enter verification code</label>
      <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
       {otp.map((digit, i) => (
        <input
         key={i}
         ref={el => (inputRefs.current[i] = el)}
         type="text"
         inputMode="numeric"
         maxLength={1}
         value={digit}
         onChange={e => handleOtpChange(i, e.target.value)}
         onKeyDown={e => handleKeyDown(i, e)}
         className="w-11 h-13 text-center text-xl font-bold rounded-xl border border-theme-border bg-theme-bg dark:bg-gray-800 text-theme-text focus:outline-none focus:border-theme-primary/50 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/40 transition-all"
         style={{ height: '52px' }}
        />
       ))}
      </div>

      <button type="submit" disabled={loading}
       className="w-full btn-primary justify-center py-2.5 disabled:opacity-70 disabled:cursor-not-allowed">
       {loading
        ? <span className="flex items-center gap-2"><Spinner /> Verifying…</span>
        : <><span>Verify Email</span><ArrowRight size={15} /></>}
      </button>
     </form>

     <div className="mt-5 text-center">
      <p className="text-sm text-theme-muted">Didn't receive the code?</p>
      <button onClick={handleResend} disabled={resending || cooldown > 0}
       className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-theme-primary hover:text-theme-primary-hover disabled:text-theme-muted disabled:cursor-not-allowed transition-colors">
       <RotateCcw size={13} className={resending ? 'animate-spin' : ''} />
       {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
      </button>
     </div>
    </div>

    <p className="text-center text-sm text-theme-muted mt-5">
     Wrong account?{' '}
     <Link to="/signup" className="text-theme-primary hover:text-theme-primary-hover font-semibold">Sign up again</Link>
    </p>
   </div>
  </div>
 )
}

function Spinner() {
 return (
  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
 )
}
