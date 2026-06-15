/**
 * api.js — centralized fetch wrapper for the Thikana backend.
 */

const BASE_URL = '/api'
// Persist access token in localStorage so it survives reloads.
let accessToken = null
let refreshPromise = null

export function getAccessToken() {
 return accessToken
}

export function setAccessToken(token) {
 accessToken = token || null
 if (token) {
  try { localStorage.setItem('thikana_token', token) } catch (e) { /* ignore */ }
 } else {
  try { localStorage.removeItem('thikana_token') } catch (e) { /* ignore */ }
 }
}

async function refreshAccessToken() {
 if (!refreshPromise) {
  refreshPromise = request('/auth/refresh', { method: 'POST', skipAuth: true, skipRefresh: true })
   .then(data => {
    setAccessToken(data.token)
    return data
   })
   .finally(() => { refreshPromise = null })
 }
 return refreshPromise
}

async function request(endpoint, { method = 'GET', body, token, skipAuth = false, skipRefresh = false } = {}) {
 const headers = {}
 const authToken = token || accessToken
 if (!skipAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`
 if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'

 const res = await fetch(`${BASE_URL}${endpoint}`, {
  method,
  headers,
  credentials: 'include',
  body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
 })

 if (res.status === 401 && !skipRefresh) {
  console.debug('[api] 401 received for', endpoint, 'attempting refresh')
  try {
   await refreshAccessToken()
   return request(endpoint, { method, body, token, skipAuth, skipRefresh: true })
  } catch (err) {
   console.warn('[api] refresh failed', err)
   setAccessToken(null)
   window.dispatchEvent(new Event('auth_error'))
  }
 }

 const data = await res.json()
 if (!res.ok) {
  const error = new Error(data.message || 'Something went wrong.')
  error.status = res.status
  error.data  = data
  throw error
 }
 return data
}

/* ─── Auth ───────────────────────────────────────────────── */

export async function signup(payload) {
 return request('/auth/signup', { method: 'POST', body: payload })
}

export async function verifyEmail(payload) {
 const data = await request('/auth/verify-email', { method: 'POST', body: payload })
 if (data.token) setAccessToken(data.token)
 return data
}

export async function resendOtp(email) {
 return request('/auth/resend-otp', { method: 'POST', body: { email } })
}

export async function login(payload) {
 const data = await request('/auth/login', { method: 'POST', body: payload })
 if (data.token) setAccessToken(data.token)
 return data
}

export async function getMe() {
 return request('/auth/me')
}

export async function refreshSession() {
 return refreshAccessToken()
}

export function logout() {
 setAccessToken(null)
 return request('/auth/logout', { method: 'POST', skipAuth: true, skipRefresh: true }).catch(() => {})
}

export async function forgotPassword(email) {
 return request('/auth/forgot-password', { method: 'POST', body: { email } })
}

export async function resetPassword(payload) {
 return request('/auth/reset-password', { method: 'POST', body: payload })
}

export async function changePassword(payload) {
 return request('/auth/change-password', { method: 'POST', body: payload })
}

/* ─── Profile ────────────────────────────────────────────── */

export async function getProfile() {
 return request('/profile/me')
}

export async function updateProfile(payload) {
 return request('/profile/me', { method: 'PUT', body: payload })
}

export async function uploadAvatar(base64Str) {
 return request('/profile/me/avatar', { method: 'PUT', body: { avatar_base64: base64Str } })
}

/* ─── NID Verification ───────────────────────────────────── */

export async function getNidStatus() {
 return request('/nid/status')
}

export async function submitNid(payload) {
 return request('/nid/submit', { method: 'POST', body: payload })
}

/* ─── Products ────────────────────────────────────────────── */

export async function getProducts(params = {}) {
 const query = new URLSearchParams(params).toString()
 return request(`/products${query ? '?' + query : ''}`)
}

export async function getPublicStats() {
 return request('/products/stats', { skipAuth: true })
}

export async function uploadProduct(payload) {
 return request('/products', { method: 'POST', body: payload })
}

export async function getProductById(id) {
 return request(`/products/${id}`)
}

export async function editProduct(id, payload) {
 return request(`/products/${id}`, { method: 'PATCH', body: payload })
}

/* ─── Favourites ─────────────────────────────────────────── */

export async function getFavourites() {
 return request('/favourites')
}

export async function toggleFavourite(productId) {
 return request(`/favourites/${productId}`, { method: 'POST' })
}

export async function getFavouriteStatus(productId) {
 return request(`/favourites/${productId}/status`)
}

/* ─── Inquiries ──────────────────────────────────────────── */

export async function sendInquiry(payload) {
 return request('/inquiries', { method: 'POST', body: payload })
}

export async function getSellerInquiries() {
 return request('/inquiries/seller')
}

export async function getUnreadInquiryCount() {
 return request('/inquiries/unread-count')
}

export async function markInquiryRead(id) {
 return request(`/inquiries/${id}/read`, { method: 'PATCH' })
}

/* ─── Reviews ────────────────────────────────────────────── */

export async function addReview(payload) {
 return request('/reviews', { method: 'POST', body: payload })
}

export async function getProductReviews(productId) {
 return request(`/reviews/product/${productId}`)
}

/* ─── Cart ───────────────────────────────────────────────── */

export async function getCart() {
 return request('/cart')
}

export async function getCartCount() {
 return request('/cart/count')
}

export async function addToCart(productId) {
 return request('/cart', { method: 'POST', body: { product_id: productId } })
}

export async function removeFromCart(cartItemId) {
 return request(`/cart/${cartItemId}`, { method: 'DELETE' })
}

export async function clearCart() {
 return request('/cart', { method: 'DELETE' })
}

/* ─── Orders ─────────────────────────────────────────────── */

export async function placeOrder(payload) {
 return request('/orders', { method: 'POST', body: payload })
}

export async function placeBooking(payload) {
 return request('/orders/booking', { method: 'POST', body: payload })
}

export async function getMyOrders() {
 return request('/orders')
}

export async function getSellerOrders() {
 return request('/orders/seller')
}

export async function getOrderById(orderId) {
 return request(`/orders/${orderId}`)
}

export async function updateOrderStatus(orderId, statusOrPayload) {
 const payload = typeof statusOrPayload === 'string'
  ? { status: statusOrPayload }
  : (statusOrPayload || {})
 return request(`/orders/${orderId}/status`, { method: 'PATCH', body: payload })
}

/* ─── Messages ───────────────────────────────────────────── */

export async function getConversations() {
 return request('/messages/conversations')
}

export async function getMessageHistory(userId, params = {}) {
 const query = new URLSearchParams(params).toString()
 return request(`/messages/${userId}${query ? '?' + query : ''}`)
}

export async function sendMsg(payload) {
 return request('/messages', { method: 'POST', body: payload })
}

export async function markConversationRead(userId) {
 return request(`/messages/${userId}/read`, { method: 'PATCH' })
}

export async function getUnreadMessageCount() {
 return request('/messages/unread-count')
}

export async function uploadChatFile(type, file) {
 const formData = new FormData()
 formData.append('file', file)
 return request(`/upload/chat/${type}`, { method: 'POST', body: formData })
}

/* ─── Notifications ──────────────────────────────────────── */

export async function getNotifications(params = {}) {
 const query = new URLSearchParams(params).toString()
 return request(`/notifications${query ? '?' + query : ''}`)
}

export async function getNotificationUnreadCount() {
 return request('/notifications/unread-count')
}

export async function markNotificationRead(id) {
 return request(`/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead() {
 return request('/notifications/read-all', { method: 'PATCH' })
}

/* ─── Admin ──────────────────────────────────────────────── */

export async function getAdminStats() {
 return request('/admin/dashboard')
}

export async function getAdminDashboard() {
 return request('/admin/dashboard')
}

export async function getAdminProducts(params = {}) {
 const q = new URLSearchParams(params).toString()
 return request(`/admin/products${q ? '?' + q : ''}`)
}

export async function adminReviewProduct(payload) {
 return request('/admin/products/review', { method: 'POST', body: payload })
}

export async function getAdminNid(params = {}) {
 const q = new URLSearchParams(params).toString()
 return request(`/admin/kyc${q ? '?' + q : ''}`)
}

export async function adminReviewNid(payload) {
 return request('/admin/kyc/review', { method: 'POST', body: payload })
}

export async function adminUpdateKycFlag(submissionId, payload) {
 return request(`/admin/kyc/${submissionId}/flags`, { method: 'PATCH', body: payload })
}

export async function adminBlockNid(payload) {
 return request('/admin/kyc/block', { method: 'POST', body: payload })
}

export async function getAdminNidImageUrl(submissionId, type) {
 const authToken = accessToken
 const res = await fetch(`${BASE_URL}/admin/nid/${submissionId}/image/${type}`, {
  headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  credentials: 'include',
 })
 if (!res.ok) throw new Error('Failed to load secure verification image.')
 const blob = await res.blob()
 return URL.createObjectURL(blob)
}

export async function getAdminUsers(params = {}) {
 const q = new URLSearchParams(params).toString()
 return request(`/admin/users${q ? '?' + q : ''}`)
}

export async function adminUpdateUserStatus(userId, payload) {
 return request(`/admin/users/${userId}/status`, { method: 'PATCH', body: payload })
}

export async function getAdminSettings() {
 return request('/admin/settings')
}

export async function updateAdminSettings(payload) {
 return request('/admin/settings', { method: 'PUT', body: { settings: payload } })
}

export async function getAdminActivities(params = {}) {
 const q = new URLSearchParams(params).toString()
 return request(`/admin/activities${q ? '?' + q : ''}`)
}

/* ─── AI & NLP Recommendation System ──────────────────────── */

export async function chatWithAiBot(message, history) {
  return request('/ai/chatbot', { method: 'POST', body: { message, history } })
}

export async function compareProducts(productIds) {
  return request('/ai/compare', { method: 'POST', body: { productIds } })
}

export async function getAiRecommendations() {
  return request('/ai/recommendations')
}
