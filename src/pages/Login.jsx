import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, X as XIcon } from 'lucide-react'
import { login as loginApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }
function validate({ email, password }) {
  const e = {}
  if (!email)                    e.email    = 'Email address is required'
  else if (!validateEmail(email)) e.email    = 'Please enter a valid email address'
  if (!password)                 e.password = 'Password is required'
  else if (password.length < 8)  e.password = 'Password must be at least 8 characters'
  return e
}

export default function Login() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const auth         = useAuth()
  const redirectTo = (() => {
    const from = location.state?.from
    if (!from) return '/'
    return `${from.pathname || '/'}${from.search || ''}${from.hash || ''}`
  })()

  const [fields,      setFields]      = useState({ email: '', password: '' })
  const [errors,      setErrors]      = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [serverError, setServerError] = useState('')

  const handleChange = e => {
    const { name, value } = e.target
    setFields(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
    if (serverError) setServerError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setServerError('')
    const errs = validate(fields)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const data = await loginApi({ email: fields.email, password: fields.password })
      auth.login(data.user)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err.data?.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(err.data.email)}`, { replace: true })
        return
      }
      setServerError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={bgStyle}>
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div style={{ position:'absolute', width:'50vw', height:'50vw', top:'-15%', right:'-10%', borderRadius:'40% 60% 55% 45%/50% 45% 55% 50%', background:'rgb(var(--glass-blob-1)/0.2)', filter:'blur(70px)' }} />
        <div style={{ position:'absolute', width:'35vw', height:'35vw', bottom:'-10%', left:'-8%', borderRadius:'60% 40% 45% 55%/45% 60% 40% 55%', background:'rgb(var(--glass-blob-2)/0.22)', filter:'blur(55px)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize:'40px 40px' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">

        {/* Logo + heading */}
        <div className="text-center mb-7">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <Logo size={38} />
            <span className="text-xl font-extrabold text-white">Thikana</span>
          </Link>
          <h1 className="text-3xl font-black text-white">Welcome back</h1>
          <p className="text-sm mt-1.5" style={{ color:'rgba(255,255,255,0.5)' }}>
            Sign in to your Thikana account
          </p>
        </div>

        {/* Glass Card */}
        <div className="rounded-3xl p-7" style={cardStyle}>

          {/* Server error */}
          {serverError && (
            <div role="alert" className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5 text-sm"
              style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>
              <XIcon size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-300">{serverError}</span>
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email */}
            <GlassField label="Email address" error={errors.email} htmlFor="login-email">
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color:'rgba(255,255,255,0.4)' }} />
                <input id="login-email" name="email" type="email" autoComplete="email"
                  value={fields.email} onChange={handleChange}
                  placeholder="you@example.com"
                  className="glass-input pl-10"
                  style={errors.email ? errorInputStyle : {}} />
              </div>
            </GlassField>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-sm font-semibold"
                  style={{ color:'rgba(255,255,255,0.8)' }}>
                  Password
                </label>
                <Link to="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color:'rgb(var(--theme-primary))' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color:'rgba(255,255,255,0.4)' }} />
                <input id="login-password" name="password"
                  type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  value={fields.password} onChange={handleChange}
                  placeholder="Enter your password"
                  className="glass-input pl-10 pr-10"
                  style={errors.password ? errorInputStyle : {}} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color:'rgba(255,255,255,0.4)' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <XIcon size={11} className="flex-shrink-0" /> {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" id="login-submit-btn" disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background:'rgb(var(--theme-primary))', color:'rgb(var(--theme-primary-text))' }}>
              {loading
                ? <><Spinner /> Signing in…</>
                : <><span>Sign in</span><ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm mt-5" style={{ color:'rgba(255,255,255,0.5)' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold" style={{ color:'rgb(var(--theme-primary))' }}>
            Sign up free
          </Link>
        </p>
        <p className="text-center text-xs mt-2.5 flex items-center justify-center gap-1.5"
          style={{ color:'rgba(255,255,255,0.35)' }}>
          <ShieldCheck size={11} className="text-emerald-500" />
          Protected with end-to-end encryption
        </p>
      </div>
    </div>
  )
}

/* ── Shared styles ────────────────────────────────────── */
const bgStyle = {
  background: 'linear-gradient(135deg, rgb(var(--hero-grad-from)) 0%, rgb(var(--hero-grad-mid)) 50%, rgb(var(--hero-grad-to)) 100%)',
}
const cardStyle = {
  background: 'rgba(0,0,0,0.35)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.12)',
}
const errorInputStyle = {
  borderColor: 'rgba(239,68,68,0.6)',
  background: 'rgba(239,68,68,0.06)',
}

/* ── Sub-components ───────────────────────────────────── */
function GlassField({ label, error, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold mb-1.5"
        style={{ color:'rgba(255,255,255,0.8)' }}>
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
          <XIcon size={11} className="flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  )
}
