import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe, logout as apiLogout, refreshSession, setAccessToken } from '../services/api'

/**
 * AuthContext — global auth state accessible throughout the app.
 * Provides: user, loading, login (setter), logout
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
 const [user, setUser]    = useState(null)
 const [loading, setLoading] = useState(true) // true on first mount while verifying token
 const [appMode, setAppMode] = useState(localStorage.getItem('thikana_appMode') || 'buying')

 // On mount: restore the session from the HTTP-only refresh cookie.
 useEffect(() => {
  refreshSession()
   .then((data) => setUser(data.user))
   .catch(() => setAccessToken(null))
   .finally(() => setLoading(false))
 }, [])

 // Listen for global auth errors
 useEffect(() => {
   const handleAuthError = () => setUser(null)
   window.addEventListener('auth_error', handleAuthError)
   return () => window.removeEventListener('auth_error', handleAuthError)
 }, [])

 /** Call this after a successful login/signup API response */
 const login = useCallback((userData) => {
  setUser(userData)
 }, [])

 /** Clear user and revoke the refresh session */
 const logout = useCallback(() => {
  apiLogout()
  setUser(null)
 }, [])

 /** Re-fetch user from server (e.g. after profile edit) */
 const refreshUser = useCallback(async () => {
  try {
   const data = await getMe()
   setUser(data.user)
  } catch {
   // token gone — leave as-is
  }
 }, [])

 const toggleAppMode = useCallback(() => {
   setAppMode(prev => {
     const next = prev === 'buying' ? 'selling' : 'buying'
     localStorage.setItem('thikana_appMode', next)
     return next
   })
 }, [])

 return (
  <AuthContext.Provider value={{ user, loading, appMode, toggleAppMode, login, logout, refreshUser }}>
   {children}
  </AuthContext.Provider>
 )
}

/** Convenience hook */
export function useAuth() {
 const ctx = useContext(AuthContext)
 if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
 return ctx
}
