import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Mail, Lock, Eye, EyeOff, ArrowRight,
  ShieldCheck, CheckCircle2, Home, Tag, Check, X as XIcon,
} from 'lucide-react'
import { signup as signupApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

/* ── Helpers ───────────────────────────────────────────── */
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }

const PASSWORD_RULES = [
  { key: 'length',    label: 'At least 8 characters',       test: p => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter (A–Z)',   test: p => /[A-Z]/.test(p) },
  { key: 'number',    label: 'One number (0–9)',             test: p => /[0-9]/.test(p) },
]

function getStrength(p) {
  if (!p) return { level: 0, label: '', color: '' }
  const passed = PASSWORD_RULES.filter(r => r.test(p)).length
  return [
    { level: 1, label: 'Weak',   color: 'bg-red-400' },
    { level: 2, label: 'Fair',   color: 'bg-yellow-400' },
    { level: 3, label: 'Strong', color: 'bg-emerald-400' },
  ][Math.min(passed, 3) - 1] || { level: 0, label: '', color: '' }
}

function validate(f) {
  const e = {}
  if (!f.fullName.trim())       e.fullName = 'Full name is required'
  else if (f.fullName.length < 3) e.fullName = 'Name must be at least 3 characters'
  if (!f.email)                 e.email = 'Email address is required'
  else if (!validateEmail(f.email)) e.email = 'Please enter a valid email address'
  if (!f.role)                  e.role = 'Please choose your account type'
  if (!f.password)              e.password = 'Password is required'
  else if (f.password.length < 8) e.password = 'Password must be at least 8 characters'
  else if (!/[A-Z]/.test(f.password)) e.password = 'Password needs at least one uppercase letter'
  else if (!/[0-9]/.test(f.password)) e.password = 'Password needs at least one number'
  if (!f.confirmPassword)       e.confirmPassword = 'Please confirm your password'
  else if (f.password !== f.confirmPassword) e.confirmPassword = 'Passwords do not match — please try again'
  if (!f.agreedToTerms)         e.agreedToTerms = 'You must agree to the Terms & Privacy Policy to continue'
  return e
}

const ROLES = [
  {
    value: 'buyer',
    icon: Home,
    title: 'Buyer',
    desc: 'Browse properties & purchase home products',
  },
  {
    value: 'seller',
    icon: Tag,
    title: 'Seller',
    desc: 'List properties & sell home products',
  },
]

/* ── Page ─────────────────────────────────────────────── */
export default function Signup() {
  const navigate = useNavigate()
  const auth     = useAuth()

  const [fields, setFields] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', role: '', agreedToTerms: false,
  })
  const [errors,      setErrors]      = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]  = useState(false)
  const [loading,     setLoading]      = useState(false)
  const [serverError, setServerError]  = useState('')
  const [success,     setSuccess]      = useState(false)

  const strength = getStrength(fields.password)
  const pwdRulesMet = fields.password
    ? PASSWORD_RULES.map(r => ({ ...r, met: r.test(fields.password) }))
    : null

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setFields(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }))
    if (serverError) setServerError('')
  }

  const handleRoleSelect = role => {
    setFields(p => ({ ...p, role }))
    if (errors.role) setErrors(p => ({ ...p, role: '' }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setServerError('')
    const errs = validate(fields)
    if (Object.keys(errs).length) {
      setErrors(errs)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setLoading(true)
    try {
      const data = await signupApi({
        fullName: fields.fullName, email: fields.email,
        password: fields.password, role: fields.role,
      })
      if (data.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`, { replace: true })
        return
      }
      if (data.token && data.user) {
        auth.login(data.user)
        setSuccess(true)
        setTimeout(() => navigate('/'), 1800)
      }
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  /* Success screen */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <div className="text-center animate-slide-up">
          <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={38} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
          <p className="text-white/60 text-sm">Welcome to Thikana. Redirecting you home…</p>
        </div>
      </div>
    )
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
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <Logo size={36} />
            <span className="text-xl font-extrabold text-white">Thikana</span>
          </Link>
          <h1 className="text-3xl font-black text-white">Create account</h1>
          <p className="text-white/55 text-sm mt-1.5">Start your journey — completely free.</p>
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

          <form id="signup-form" onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Full Name */}
            <GlassField label="Full Name" error={errors.fullName}>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'rgba(255,255,255,0.4)' }} />
                <input id="signup-fullname" name="fullName" type="text" autoComplete="name"
                  value={fields.fullName} onChange={handleChange} placeholder="John Doe"
                  className="glass-input pl-10" style={errors.fullName ? errorInputStyle : {}} />
              </div>
            </GlassField>

            {/* Email */}
            <GlassField label="Email address" error={errors.email}>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'rgba(255,255,255,0.4)' }} />
                <input id="signup-email" name="email" type="email" autoComplete="email"
                  value={fields.email} onChange={handleChange} placeholder="you@example.com"
                  className="glass-input pl-10" style={errors.email ? errorInputStyle : {}} />
              </div>
            </GlassField>

            {/* Role — Card selector */}
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">I am a…</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(r => {
                  const isSelected = fields.role === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleRoleSelect(r.value)}
                      className="relative rounded-2xl p-4 text-left transition-all duration-200 focus:outline-none"
                      style={{
                        background: isSelected
                          ? 'rgba(var(--theme-primary),0.2)'
                          : 'rgba(255,255,255,0.06)',
                        border: isSelected
                          ? '1.5px solid rgb(var(--theme-primary))'
                          : '1.5px solid rgba(255,255,255,0.1)',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background:'rgb(var(--theme-primary))' }}>
                          <Check size={11} className="text-black" />
                        </div>
                      )}
                      <div className="text-2xl mb-2">{r.emoji}</div>
                      <div className="font-bold text-white text-sm">{r.title}</div>
                      <div className="text-[11px] mt-0.5 leading-snug" style={{ color:'rgba(255,255,255,0.5)' }}>{r.desc}</div>
                    </button>
                  )
                })}
              </div>
              {errors.role && <p role="alert" className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><XIcon size={11}/> {errors.role}</p>}
            </div>

            {/* Password */}
            <GlassField label="Password" error={errors.password}>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'rgba(255,255,255,0.4)' }} />
                <input id="signup-password" name="password"
                  type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                  value={fields.password} onChange={handleChange} placeholder="Min. 8 characters"
                  className="glass-input pl-10 pr-10" style={errors.password ? errorInputStyle : {}} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color:'rgba(255,255,255,0.4)' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength bar */}
              {fields.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1.5">
                    {[1,2,3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                        ${i <= strength.level ? strength.color : 'bg-white/15'}`} />
                    ))}
                  </div>
                  {/* Per-requirement checklist */}
                  <div className="space-y-1">
                    {pwdRulesMet?.map(rule => (
                      <div key={rule.key} className="flex items-center gap-1.5">
                        {rule.met
                          ? <Check size={11} className="text-emerald-400 flex-shrink-0" />
                          : <XIcon size={11} className="text-red-400/70 flex-shrink-0" />}
                        <span className={`text-[11px] ${rule.met ? 'text-emerald-400' : 'text-white/40'}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassField>

            {/* Confirm Password */}
            <GlassField label="Confirm Password" error={errors.confirmPassword}>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'rgba(255,255,255,0.4)' }} />
                <input id="signup-confirm" name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                  value={fields.confirmPassword} onChange={handleChange} placeholder="Repeat your password"
                  className="glass-input pl-10 pr-10" style={errors.confirmPassword ? errorInputStyle : {}} />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  aria-label="Toggle confirm password visibility"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color:'rgba(255,255,255,0.4)' }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Live match indicator */}
              {fields.confirmPassword && fields.password && (
                <p className={`text-[11px] mt-1 flex items-center gap-1 ${fields.password === fields.confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fields.password === fields.confirmPassword
                    ? <><Check size={11}/> Passwords match</>
                    : <><XIcon size={11}/> Passwords don't match yet</>}
                </p>
              )}
            </GlassField>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input id="signup-terms" name="agreedToTerms" type="checkbox"
                    checked={fields.agreedToTerms} onChange={handleChange} className="sr-only peer" />
                  <div className="w-5 h-5 rounded-md transition-all flex items-center justify-center"
                    style={{
                      background: fields.agreedToTerms ? 'rgb(var(--theme-primary))' : 'rgba(255,255,255,0.08)',
                      border: fields.agreedToTerms ? '1.5px solid rgb(var(--theme-primary))' : '1.5px solid rgba(255,255,255,0.2)',
                    }}>
                    {fields.agreedToTerms && <Check size={12} className="text-black" />}
                  </div>
                </div>
                <span className="text-xs leading-relaxed" style={{ color:'rgba(255,255,255,0.55)' }}>
                  I agree to Thikana's{' '}
                  <Link to="/terms" className="underline" style={{ color:'rgb(var(--theme-primary))' }}>Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="underline" style={{ color:'rgb(var(--theme-primary))' }}>Privacy Policy</Link>
                </span>
              </label>
              {errors.agreedToTerms && (
                <p role="alert" className="text-red-400 text-xs mt-1.5 flex items-center gap-1 ml-8">
                  <XIcon size={11}/> {errors.agreedToTerms}
                </p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" id="signup-submit-btn" disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background:'rgb(var(--theme-primary))', color:'rgb(var(--theme-primary-text))' }}>
              {loading
                ? <><Spinner /> Creating Account…</>
                : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>
          </form>

          {/* NID notice */}
          <div className="mt-5 p-3.5 rounded-2xl flex items-start gap-2.5"
            style={{ background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)' }}>
            <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-400 text-xs leading-relaxed">
              <strong>NID Verification</strong> — verify your National ID after sign-up to unlock a trusted badge.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm mt-5" style={{ color:'rgba(255,255,255,0.5)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold" style={{ color:'rgb(var(--theme-primary))' }}>Sign in</Link>
        </p>
        <p className="text-center text-xs mt-2.5 flex items-center justify-center gap-1.5" style={{ color:'rgba(255,255,255,0.35)' }}>
          <ShieldCheck size={11} className="text-emerald-500" />
          Protected with end-to-end encryption
        </p>
      </div>
    </div>
  )
}

/* ── Shared styles ──────────────────────────────────────── */
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

/* ── Sub-components ────────────────────────────────────── */
function GlassField({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{ color:'rgba(255,255,255,0.8)' }}>
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
