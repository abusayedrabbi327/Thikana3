import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCart as fetchCart, addToCart as apiAddToCart, removeFromCart as apiRemoveFromCart, clearCart as apiClearCart, getCartCount } from '../services/api'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
 const { user } = useAuth()
 const [cart, setCart] = useState([])
 const [cartCount, setCartCount] = useState(0)
 const [cartTotal, setCartTotal] = useState(0)
 const [loading, setLoading] = useState(false)

 const refreshCart = useCallback(async () => {
  if (!user) { setCart([]); setCartCount(0); setCartTotal(0); return }
  try {
   const data = await fetchCart()
   setCart(data.items || [])
   setCartCount(data.items?.length || 0)
   setCartTotal(data.total || 0)
  } catch { /* fail silently */ }
 }, [user])

 const refreshCount = useCallback(async () => {
  if (!user) { setCartCount(0); return }
  try {
   const data = await getCartCount()
   setCartCount(data.count || 0)
  } catch { /* fail silently */ }
 }, [user])

 useEffect(() => {
  refreshCount()
 }, [refreshCount])

 const addToCart = useCallback(async (productId) => {
  setLoading(true)
  try {
   const res = await apiAddToCart(productId)
   setCartCount(res.cartCount ?? cartCount + 1)
   return res
  } finally {
   setLoading(false)
  }
 }, [cartCount])

 const removeFromCart = useCallback(async (cartItemId) => {
  try {
   await apiRemoveFromCart(cartItemId)
   setCart(prev => {
    const updated = prev.filter(i => i.cart_item_id !== cartItemId)
    const newTotal = updated.reduce((sum, i) => sum + parseFloat(i.price) * (i.quantity || 1), 0)
    setCartTotal(newTotal)
    return updated
   })
   setCartCount(prev => Math.max(0, prev - 1))
  } catch (err) {
   throw err
  }
 }, [])

 const clearCartItems = useCallback(async () => {
  try {
   await apiClearCart()
   setCart([])
   setCartCount(0)
   setCartTotal(0)
  } catch (err) {
   throw err
  }
 }, [])

 return (
  <CartContext.Provider value={{ cart, cartCount, cartTotal, loading, addToCart, removeFromCart, clearCart: clearCartItems, refreshCart, refreshCount }}>
   {children}
  </CartContext.Provider>
 )
}

export function useCart() {
 const ctx = useContext(CartContext)
 if (!ctx) throw new Error('useCart must be inside <CartProvider>')
 return ctx
}
