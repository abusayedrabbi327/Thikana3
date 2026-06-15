import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({
 children,
 roles,
 requireAdmin = false,
 allowAdmin = false,
 requireVerifiedNid = false,
 redirectTo = '/login',
}) {
 const { user, loading } = useAuth()
 const location = useLocation()

 if (loading) {
  return (
   <div className="min-h-screen bg-theme-bg flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
   </div>
  )
 }

 if (!user) {
  return <Navigate to={redirectTo} replace state={{ from: location }} />
 }

 if (requireAdmin && !user.is_admin) {
  return <Navigate to="/" replace />
 }

 if (roles?.length) {
  const isAllowedRole = roles.includes(user.role)
  const isAllowedAdmin = allowAdmin && user.is_admin
  if (!isAllowedRole && !isAllowedAdmin) return <Navigate to="/" replace />
  if (user.is_admin && !isAllowedAdmin && !roles.includes('admin')) return <Navigate to="/" replace />
 }

 if (requireVerifiedNid && !user.is_admin && !user.nid_verified) {
  return <Navigate to="/verify-nid" replace />
 }

 return children
}
