import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Moon, Sun, Bell, Shield, LogOut, Trash2, Eye, EyeOff, Lock, CheckCircle, ChevronDown, User, Phone, MapPin, Camera, Save, Check, X as XIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { changePassword, updateProfile, uploadAvatar } from '../services/api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

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

export default function Settings() {
 const navigate = useNavigate()
 const { user, logout, refreshUser } = useAuth()
 const { dark, toggleTheme } = useTheme()

 const [pwForm, setPwForm]  = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
 const [showPw, setShowPw]  = useState(false)
 const [pwLoading, setPwLoading] = useState(false)
 const [pwError, setPwError] = useState('')
 const [pwSuccess, setPwSuccess] = useState(false)
 const [showPwForm, setShowPwForm] = useState(false)

 const strength = getStrength(pwForm.newPassword)
 const pwdRulesMet = pwForm.newPassword
     ? PASSWORD_RULES.map(r => ({ ...r, met: r.test(pwForm.newPassword) }))
     : null

 // Profile Form State
 const [showProfForm, setShowProfForm] = useState(false)
 const [profileForm, setProfileForm] = useState({
  fullName: user?.full_name || '',
  phone:  user?.phone || '',
  bio:   user?.bio || '',
 })
 const [profLoading, setProfLoading] = useState(false)
 const [profMsg, setProfMsg]     = useState({ type: '', text: '' })
 
 const [avatarDataUrl, setAvatarDataUrl] = useState('')
 const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '')

 // Address State
 const [showAddrForm, setShowAddrForm] = useState(false)
 const [addressForm, setAddressForm] = useState({
  address: user?.address || ''
 })
 const [addrLoading, setAddrLoading] = useState(false)
 const [addrMsg, setAddrMsg]     = useState({ type: '', text: '' })

 const getInitials = (name) => name?.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('') || ''
const AVATAR_GRADIENT = {
 buyer: 'from-blue-400 to-indigo-600',
 seller: 'from-purple-400 to-fuchsia-600',
 admin: 'from-rose-400 to-pink-600',
}

 const handleAvatarChange = e => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
   setAvatarPreview(ev.target.result)
   setAvatarDataUrl(ev.target.result)
  }
  reader.readAsDataURL(file)
 }

 const handleProfileSave = async (e) => {
  e.preventDefault()
  if (!profileForm.fullName.trim() || profileForm.fullName.length < 3) {
   setProfMsg({ type: 'error', text: 'Name must be at least 3 characters.' })
   return
  }
  setProfLoading(true); setProfMsg({ type: '', text: '' })
  try {
   if (avatarDataUrl) await uploadAvatar(avatarDataUrl)
   await updateProfile({ ...profileForm, address: addressForm.address })
   await refreshUser()
   setProfMsg({ type: 'success', text: 'Profile updated successfully!' })
   setTimeout(() => setProfMsg({ type: '', text: '' }), 3000)
  } catch (err) {
   setProfMsg({ type: 'error', text: err.message || 'Update failed' })
  } finally {
   setProfLoading(false)
  }
 }

 const handleAddressSave = async (e) => {
  e.preventDefault()
  setAddrLoading(true); setAddrMsg({ type: '', text: '' })
  try {
   await updateProfile({ ...profileForm, address: addressForm.address })
   await refreshUser()
   setAddrMsg({ type: 'success', text: 'Address updated successfully!' })
   setTimeout(() => setAddrMsg({ type: '', text: '' }), 3000)
  } catch(err) {
   setAddrMsg({ type: 'error', text: err.message || 'Update failed' })
  } finally {
   setAddrLoading(false)
  }
 }

 if (!user) {
  if (typeof window !== 'undefined') navigate('/login')
  return null
 }

 const handlePwChange = async (e) => {
  e.preventDefault()
  if (!pwForm.currentPassword) { setPwError('Current password is required.'); return }
  if (!pwForm.newPassword || pwForm.newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return }
  if (!/[A-Z]/.test(pwForm.newPassword)) { setPwError('New password needs at least one uppercase letter.'); return }
  if (!/[0-9]/.test(pwForm.newPassword)) { setPwError('New password needs at least one number.'); return }
  if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match.'); return }

  setPwLoading(true)
  setPwError('')
  try {
   await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
   setPwSuccess(true)
   setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
   setTimeout(() => setPwSuccess(false), 3000)
  } catch (err) {
   setPwError(err.message || 'Failed to update password.')
  } finally {
   setPwLoading(false)
  }
 }

 const handleLogout = () => { logout(); navigate('/') }

 return (
  <>
   <Navbar />
   <main className="min-h-screen bg-theme-bg pt-20 pb-12 transition-colors">
    <div className="max-w-2xl mx-auto px-4 sm:px-6 animate-fade-in">

     <div className="flex items-center gap-3 mb-6">
      <Link to="/profile" className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-white dark:hover:bg-gray-900 border border-transparent hover:border-theme-border dark:hover:border-gray-800 transition-all">
       <ArrowLeft size={18} />
      </Link>
      <h1 className="text-xl font-bold text-theme-text">Settings</h1>
     </div>

     <div className="space-y-4">

      {/* Personal Information */}
      <Section title="Personal Information">
       <div className="p-5">
        <button 
         onClick={() => setShowProfForm(v => !v)}
         className="w-full text-sm font-semibold text-theme-text flex items-center justify-between hover:text-theme-primary transition-colors"
        >
         <div className="flex items-center gap-2">
          <User size={15} className="text-theme-primary" /> Edit Profile
         </div>
         <ChevronDown size={15} className={`text-theme-muted transition-transform duration-200 ${showProfForm ? 'rotate-180' : ''}`} />
        </button>
        
        <div className={`transition-all duration-300 overflow-hidden ${showProfForm ? 'max-h-[800px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
         {profMsg.text && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${profMsg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
           {profMsg.text}
          </div>
         )}
         <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-5 mb-2 relative">
           <label className="relative cursor-pointer group block flex-shrink-0">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${AVATAR_GRADIENT[user.role] || AVATAR_GRADIENT.buyer}
             flex items-center justify-center text-white text-2xl font-bold
             overflow-hidden border-2 border-theme-border shadow-sm`}>
             {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
             ) : (
              getInitials(user.full_name)
             )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 
             transition-opacity flex items-center justify-center text-white">
             <Camera size={20} />
            </div>
            <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleAvatarChange} />
           </label>
           <div className="flex-1 space-y-3 w-full">
            <SettingInput icon={<User size={15}/>} label="Full Name" value={profileForm.fullName} onChange={v => setProfileForm(p => ({...p, fullName: v}))} />
            <SettingInput icon={<Phone size={15}/>} label="Phone" value={profileForm.phone} onChange={v => setProfileForm(p => ({...p, phone: v}))} />
           </div>
          </div>
          <div className="mb-2">
           <label htmlFor="settings-input-1" className="block text-xs font-medium text-theme-muted mb-1">Bio</label>
           <textarea id="settings-input-1" rows="3" className="input-field py-2 text-sm resize-none" value={profileForm.bio} onChange={e => setProfileForm(p => ({...p, bio: e.target.value}))} placeholder="Tell us about yourself..." />
          </div>
          <div className="flex justify-end">
           <button type="submit" disabled={profLoading} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-70">
            {profLoading ? 'Saving...' : <><Save size={14}/> Save Profile</>}
           </button>
          </div>
         </form>
        </div>
       </div>
      </Section>

      {/* Address */}
      <Section title="Address">
       <div className="p-5">
        <button 
         onClick={() => setShowAddrForm(v => !v)}
         className="w-full text-sm font-semibold text-theme-text flex items-center justify-between hover:text-theme-primary transition-colors"
        >
         <div className="flex items-center gap-2">
          <MapPin size={15} className="text-theme-primary" /> Update Address
         </div>
         <ChevronDown size={15} className={`text-theme-muted transition-transform duration-200 ${showAddrForm ? 'rotate-180' : ''}`} />
        </button>
        
        <div className={`transition-all duration-300 overflow-hidden ${showAddrForm ? 'max-h-[400px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
         {addrMsg.text && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${addrMsg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
           {addrMsg.text}
          </div>
         )}
         <form onSubmit={handleAddressSave} className="space-y-4">
          <SettingInput icon={<MapPin size={15}/>} label="Full Address" value={addressForm.address} onChange={v => setAddressForm(p => ({...p, address: v}))} placeholder="e.g. Banani, Dhaka" />
          <div className="flex justify-end mt-2">
           <button type="submit" disabled={addrLoading} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-70">
            {addrLoading ? 'Saving...' : <><Save size={14}/> Save Address</>}
           </button>
          </div>
         </form>
        </div>
       </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
       <SettingRow
        icon={dark ? <Moon size={17} className="text-indigo-400" /> : <Sun size={17} className="text-yellow-400" />}
        label="Dark Mode"
        description={dark ? 'Currently using dark theme' : 'Currently using light theme'}
        action={
         <button onClick={toggleTheme}
          className={`relative w-11 h-6 rounded-full transition-colors ${dark ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
         </button>
        }
       />
      </Section>

      {/* Security */}
      <Section title="Security">
       <div className="p-5">
        <button 
         onClick={() => setShowPwForm(v => !v)}
         className="w-full text-sm font-semibold text-theme-text flex items-center justify-between hover:text-theme-primary transition-colors"
        >
         <div className="flex items-center gap-2">
          <Lock size={15} className="text-theme-primary" /> Change Password
         </div>
         <ChevronDown size={15} className={`text-theme-muted transition-transform duration-200 ${showPwForm ? 'rotate-180' : ''}`} />
        </button>
        
        <div className={`transition-all duration-300 overflow-hidden ${showPwForm ? 'max-h-[500px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
         {pwError && <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 text-xs">{pwError}</div>}
         {pwSuccess && <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-600 text-xs flex items-center gap-1.5"><CheckCircle size={13} /> Password updated!</div>}
         <form onSubmit={handlePwChange} className="space-y-3">
          <PwInput label="Current Password" id="cur-pw" showPw={showPw} value={pwForm.currentPassword} onChange={v => setPwForm(p => ({ ...p, currentPassword: v }))} placeholder="Your current password" />
          <PwInput label="New Password" id="new-pw" showPw={showPw} value={pwForm.newPassword} onChange={v => setPwForm(p => ({ ...p, newPassword: v }))} placeholder="At least 8 characters" />
          
          {/* Strength bar */}
          {pwForm.newPassword && (
           <div className="mt-1 mb-3">
            <div className="flex gap-1 mb-1.5">
             {[1,2,3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.color : 'bg-gray-200 dark:bg-gray-700'}`} />
             ))}
            </div>
            <div className="space-y-1">
             {pwdRulesMet?.map(rule => (
              <div key={rule.key} className="flex items-center gap-1.5">
               {rule.met ? <Check size={11} className="text-emerald-500" /> : <XIcon size={11} className="text-gray-400" />}
               <span className={`text-[11px] ${rule.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                {rule.label}
               </span>
              </div>
             ))}
            </div>
           </div>
          )}

          <PwInput label="Confirm New Password" id="confirm-pw" showPw={showPw} value={pwForm.confirmPassword} onChange={v => setPwForm(p => ({ ...p, confirmPassword: v }))} placeholder="Repeat password" />
          <div className="flex items-center justify-between">
           <label className="flex items-center gap-1.5 text-xs text-theme-muted cursor-pointer">
            <input type="checkbox" className="rounded" checked={showPw} onChange={() => setShowPw(v => !v)} />
            {showPw ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
           </label>
           <button type="submit" disabled={pwLoading} className="btn-primary text-xs py-2 px-4 disabled:opacity-70">
            {pwLoading ? 'Saving…' : 'Update Password'}
           </button>
          </div>
         </form>
        </div>
       </div>
      </Section>

      {/* Notifications — placeholder */}
      <Section title="Notifications">
       <SettingRow
        icon={<Bell size={17} className="text-blue-400" />}
        label="Email Notifications"
        description="Receive email updates about your listings and inquiries"
        action={<span className="text-xs text-theme-muted bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Coming soon</span>}
       />
      </Section>

      {/* Account */}
      <Section title="Account">
       <SettingRow
        icon={<Shield size={17} className="text-emerald-400" />}
        label="NID Verification"
        description={user.nid_verified ? 'Your identity is verified' : 'Verify your identity for a trust badge'}
        action={
         user.nid_verified
          ? <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">Verified</span>
          : <Link to="/verify-nid" className="text-xs text-theme-primary hover:text-theme-primary-hover font-semibold">Verify now →</Link>
        }
       />
       <div className="border-t border-theme-border">
        <button onClick={handleLogout}
         className="w-full flex items-center gap-3 px-5 py-4 text-sm text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors rounded-b-2xl">
         <LogOut size={16} /> Sign out of Thikana
        </button>
       </div>
      </Section>

      {/* Links */}
      <div className="flex flex-wrap gap-3 text-xs text-theme-muted pt-2">
       <Link to="/terms"  className="hover:text-theme-primary transition-colors">Terms of Service</Link>
       <Link to="/privacy" className="hover:text-theme-primary transition-colors">Privacy Policy</Link>
       <span>Thikana v1.0</span>
      </div>
     </div>
    </div>
   </main>
   <Footer />
  </>
 )
}

function Section({ title, children }) {
 return (
  <div className="glass-panel overflow-hidden">
   <h2 className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-theme-muted border-b border-theme-border bg-theme-bg/50 dark:bg-gray-800/30">
    {title}
   </h2>
   {children}
  </div>
 )
}

function SettingRow({ icon, label, description, action }) {
 return (
  <div className="flex items-center justify-between px-5 py-4 gap-4">
   <div className="flex items-center gap-3">
    <span className="w-8 h-8 rounded-lg bg-theme-bg dark:bg-gray-800 flex items-center justify-center flex-shrink-0">{icon}</span>
    <div>
     <p className="text-sm font-medium text-theme-text">{label}</p>
     {description && <p className="text-xs text-theme-muted mt-0.5">{description}</p>}
    </div>
   </div>
   {action}
  </div>
 )
}

function PwInput({ label, id, showPw, value, onChange, placeholder }) {
 return (
  <div>
   <label htmlFor={id} className="block text-xs font-medium text-theme-muted mb-1">{label}</label>
   <input id={id} type={showPw ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} className="input-field py-2 text-sm" />
  </div>
 )
}

function SettingInput({ label, icon, value, onChange, placeholder, type = 'text' }) {
 return (
  <div className="w-full">
   <label className="block text-xs font-medium text-theme-muted mb-1.5">{label}</label>
   <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none">{icon}</span>
    <input type={type} className="input-field py-2 text-sm pl-[34px]" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
   </div>
  </div>
 )
}
