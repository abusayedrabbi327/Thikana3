import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { forgotPassword } from '../services/api'
import Logo from '../components/Logo'

export default function ForgotPassword() {
 const [email, setEmail]   = useState('')
 const [loading, setLoading] = useState(false)
 const [sent, setSent]    = useState(false)
 const [error, setError]   = useState('')

 const handleSubmit = async (e) => {
  e.preventDefault()
  if (!email.trim()) { setError('Please enter your email address.'); return }
  setLoading(true)
  setError('')
  try {
   await forgotPassword(email.trim())
   setSent(true)
  } catch (err) {
   setError(err.message || 'Failed to send reset email.')
  } finally {
   setLoading(false)
  }
 }

 if (sent) {
  return (
   <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4">
    <div className="w-full max-w-md text-center animate-slide-up">
     <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-5">
      <CheckCircle size={38} className="text-emerald-500" />
     </div>
     <h2 className="text-2xl font-bold text-theme-text mb-2">Check your inbox</h2>
     <p className="text-theme-muted text-sm max-w-xs mx-auto leading-relaxed">
      If <strong className="text-gray-700 dark:text-gray-200">{email}</strong> is registered, we've sent a password reset link. Check your spam folder if you don't see it.
     </p>
     <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-theme-primary hover:text-theme-primary-hover transition-colors">
      <ArrowLeft size={14} /> Back to Sign In
     </Link>
    </div>
   </div>
  )
 }

 return (
  <div className="min-h-screen flex items-center justify-center bg-theme-bg px-4 py-8 transition-colors duration-200">
   <div className="w-full max-w-md animate-slide-up">

    <div className="text-center mb-6">
     <Link to="/" className="inline-flex items-center gap-2 mb-4">
      <Logo size={36} />
      <span className="text-xl font-extrabold text-theme-text">Thikana</span>
     </Link>
     <div className="w-14 h-14 bg-theme-primary/20 dark:bg-orange-950/40 border border-theme-primary/30 dark:border-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Mail size={26} className="text-theme-primary" />
     </div>
     <h1 className="text-2xl font-black text-theme-text">Forgot your password?</h1>
     <p className="text-theme-muted text-sm mt-2 max-w-xs mx-auto leading-relaxed">
      No worries. Enter your email and we'll send you a reset link.
     </p>
    </div>

    <div className="bg-theme-card border border-theme-border rounded-2xl shadow-sm p-7">
     {error && (
      <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm text-center">
       {error}
      </div>
     )}

     <form onSubmit={handleSubmit} className="space-y-4">
      <div>
       <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
       <input
        id="forgot-email"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        placeholder="you@example.com"
        className="input-field"
       />
      </div>

      <button type="submit" disabled={loading}
       className="w-full btn-primary justify-center py-2.5 disabled:opacity-70 disabled:cursor-not-allowed">
       {loading ? <><Spinner /> Sending…</> : 'Send reset link'}
      </button>
     </form>
    </div>

    <p className="text-center text-sm text-theme-muted mt-5">
     <Link to="/login" className="inline-flex items-center gap-1.5 text-theme-primary hover:text-theme-primary-hover font-semibold transition-colors">
      <ArrowLeft size={13} /> Back to Sign In
     </Link>
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
