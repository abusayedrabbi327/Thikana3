import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider }     from './context/AuthContext'
import { ThemeProvider }    from './context/ThemeContext'
import { CartProvider }     from './context/CartContext'
import { SocketProvider }    from './context/SocketContext'
import { NotificationProvider } from './context/NotificationContext'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Profile = lazy(() => import('./pages/Profile'))
const NidVerify = lazy(() => import('./pages/NidVerify'))
const UploadProduct = lazy(() => import('./pages/UploadProduct'))
const ProductDetails = lazy(() => import('./pages/ProductDetails'))
const Settings = lazy(() => import('./pages/Settings'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Admin = lazy(() => import('./pages/Admin'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Messages = lazy(() => import('./pages/Messages'))
const Notifications = lazy(() => import('./pages/Notifications'))
const OrderDetails = lazy(() => import('./pages/OrderDetails'))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'))
const Chatbot = lazy(() => import('./pages/Chatbot'))
const Compare = lazy(() => import('./pages/Compare'))

export default function App() {
 return (
  <ThemeProvider>
   <AuthProvider>
    <SocketProvider>
     <CartProvider>
      <NotificationProvider>
    <BrowserRouter>
     <Suspense fallback={<div className="min-h-screen bg-theme-bg" />}> 
      <Routes>
       <Route path="/"        element={<Home />} />
       <Route path="/login"      element={<Login />} />
       <Route path="/signup"     element={<Signup />} />
       <Route path="/verify-email"  element={<VerifyEmail />} />
       <Route path="/forgot-password" element={<ForgotPassword />} />
       <Route path="/reset-password" element={<ResetPassword />} />
       <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
       <Route path="/verify-nid"   element={<ProtectedRoute roles={['buyer', 'seller']}><NidVerify /></ProtectedRoute>} />
       <Route path="/upload-product" element={<ProtectedRoute roles={['seller']} requireVerifiedNid><UploadProduct /></ProtectedRoute>} />
       <Route path="/product/:id"   element={<ProductDetails />} />
       <Route path="/chatbot"     element={<Chatbot />} />
       <Route path="/compare"     element={<Compare />} />
       <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
       <Route path="/terms"      element={<Terms />} />
       <Route path="/privacy"     element={<Privacy />} />
       <Route path="/admin"      element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
       <Route path="/cart"      element={<ProtectedRoute roles={['buyer']}><Cart /></ProtectedRoute>} />
       <Route path="/checkout"    element={<ProtectedRoute roles={['buyer']} requireVerifiedNid><Checkout /></ProtectedRoute>} />
       <Route path="/messages"    element={<ProtectedRoute roles={['buyer', 'seller']} requireVerifiedNid><Messages /></ProtectedRoute>} />
       <Route path="/notifications"  element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
       <Route path="/orders/:id"    element={<ProtectedRoute roles={['buyer', 'seller']} allowAdmin><OrderDetails /></ProtectedRoute>} />
      </Routes>
     </Suspense>
    </BrowserRouter>
      </NotificationProvider>
     </CartProvider>
    </SocketProvider>
   </AuthProvider>
  </ThemeProvider>
 )
}
