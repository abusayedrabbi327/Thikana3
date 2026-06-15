const pool = require('../config/db')
const { createNotification } = require('./notificationController')

function notifyBestEffort(userId, type, title, content, targetUrl) {
  createNotification(userId, type, title, content, targetUrl)
    .catch((err) => {
      console.error('[notification error]', { userId, type, err: err?.message || err })
    })
}

const BUYER_CANCELLATION_REASONS = {
  changed_mind: 'Changed mind',
  ordered_by_mistake: 'Ordered by mistake',
  found_better_option: 'Found a better option',
  delivery_taking_too_long: 'Delivery is taking too long',
  payment_or_budget_issue: 'Payment or budget issue',
  others: 'Others',
}

const SELLER_CANCELLATION_REASONS = {
  item_out_of_stock: 'Item is out of stock',
  listing_issue: 'Listing information issue',
  unable_to_fulfill: 'Unable to fulfill the order now',
  buyer_unreachable: 'Buyer is unreachable',
  logistics_issue: 'Logistics or delivery issue',
  others: 'Others',
}

async function placeOrder(req, res) {
  const { shipping_address, phone, note, delivery_type = 'inside' } = req.body
  if (!shipping_address || !phone) {
    return res.status(400).json({ success: false, message: 'Shipping address and phone are required.' })
  }
  const deliveryFee = delivery_type === 'outside' ? 50 : 20
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: cartItems } = await client.query(`
      SELECT ci.*, p.price, p.title, p.status, p.seller_id, p.category
      FROM cart_items ci JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1 FOR UPDATE
    `, [req.user.id])
    if (cartItems.length === 0) { await client.query('ROLLBACK'); client.release(); return res.status(400).json({ success: false, message: 'Your cart is empty.' }) }

    const productIds = cartItems.map(item => item.product_id)
    const { rows: productRows } = await client.query(
      'SELECT id, price, status FROM products WHERE id = ANY($1::int[]) FOR UPDATE',
      [productIds]
    )
    const productById = new Map(productRows.map(row => [row.id, row]))

    let itemTotalCents = 0
    const unavailable = []
    const priceDriftItems = []

    for (const item of cartItems) {
      const currentProd = productById.get(item.product_id)

      if (!currentProd || currentProd.status !== 'approved') {
        unavailable.push(item.title)
      } else if (Math.round(currentProd.price * 100) !== Math.round(item.price * 100)) {
        priceDriftItems.push(item.title)
      } else {
        itemTotalCents += Math.round(currentProd.price * 100) * item.quantity
      }
    }

    if (unavailable.length > 0) { await client.query('ROLLBACK'); client.release(); return res.status(400).json({ success: false, message: `Some items are no longer available: ${unavailable.join(', ')}` }) }
    if (priceDriftItems.length > 0) { await client.query('ROLLBACK'); client.release(); return res.status(400).json({ success: false, message: `Price has changed for items: ${priceDriftItems.join(', ')}. Please update your cart.` }) }

    const totalAmountCents = itemTotalCents + (deliveryFee * 100)
    const totalAmount = totalAmountCents / 100
    const earnedPoints = Math.floor(itemTotalCents / 10000) * 10

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (buyer_id, status, total_amount, shipping_address, phone, note, delivery_fee) VALUES ($1, 'confirmed', $2, $3, $4, $5, $6) RETURNING id`,
      [req.user.id, totalAmount, shipping_address.trim(), phone.trim(), note?.trim() || null, deliveryFee]
    )
    const orderId = orderRows[0].id
    for (const item of cartItems) {
      await client.query('INSERT INTO order_items (order_id, product_id, seller_id, price, quantity) VALUES ($1, $2, $3, $4, $5)', [orderId, item.product_id, item.seller_id, item.price, item.quantity])
      await client.query(`UPDATE products SET status = 'sold' WHERE id = $1 AND status = 'approved'`, [item.product_id])
    }
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id])
    if (earnedPoints > 0) { await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [earnedPoints, req.user.id]) }
    await client.query('COMMIT')
    client.release()
    const { rows: buyers } = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id])
    const buyerName = buyers[0]?.full_name || 'A buyer'
    const sellerIds = [...new Set(cartItems.map(i => i.seller_id))]
    for (const sellerId of sellerIds) {
      const sellerItems = cartItems.filter(i => i.seller_id === sellerId)
      const titles = sellerItems.map(i => i.title).join(', ')
      notifyBestEffort(sellerId, 'order', 'New Order Received! 🛍️', `${buyerName} purchased: ${titles}`, `/orders/${orderId}`)
    }
    notifyBestEffort(req.user.id, 'order', 'Order Confirmed! ✅', `Your order #${orderId} for ৳${totalAmount.toLocaleString()} has been placed successfully.`, `/orders/${orderId}`)
    if (earnedPoints > 0) { notifyBestEffort(req.user.id, 'system', 'Reward Points Earned! 🎁', `You earned ${earnedPoints} points from your recent purchase.`, `/orders/${orderId}`) }
    return res.status(201).json({ success: true, message: 'Order placed successfully!', orderId, total: totalAmount, earnedPoints })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    client.release()
    console.error('[placeOrder error]', err)
    return res.status(500).json({ success: false, message: 'Failed to place order.' })
  }
}

async function getMyOrders(req, res) {
  try {
    const { rows: orders } = await pool.query('SELECT * FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC', [req.user.id])
    if (orders.length === 0) return res.json({ success: true, orders: [] })
    const orderIds = orders.map(o => o.id)
    const { rows: allItems } = await pool.query(`
      SELECT oi.*, p.title, p.category,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as main_image,
             u.full_name as seller_name, u.phone as seller_phone,
             r.id as review_id
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON oi.seller_id = u.id
      LEFT JOIN reviews r ON r.order_item_id = oi.id AND r.buyer_id = $1
      WHERE oi.order_id = ANY($2)
    `, [req.user.id, orderIds])
    const itemMap = {}
    for (const item of allItems) { if (!itemMap[item.order_id]) itemMap[item.order_id] = []; itemMap[item.order_id].push(item) }
    for (const order of orders) { order.items = itemMap[order.id] || [] }
    return res.json({ success: true, orders })
  } catch (err) {
    console.error('[getMyOrders error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getOrderById(req, res) {
  try {
    const orderId = parseInt(req.params.id)
    if (!Number.isInteger(orderId) || orderId <= 0) return res.status(400).json({ success: false, message: 'Invalid order id.' })
    const { rows: orders } = await pool.query(`
      SELECT o.*, b.full_name as buyer_name, b.email as buyer_email, b.phone as buyer_phone, b.address as buyer_address, b.avatar_url as buyer_avatar
      FROM orders o JOIN users b ON b.id = o.buyer_id WHERE o.id = $1 LIMIT 1
    `, [orderId])
    if (orders.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' })
    const order = orders[0]
    const isBuyer = order.buyer_id === req.user.id
    const { rows: sellerLinks } = await pool.query('SELECT seller_id FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1', [orderId, req.user.id])
    const isSeller = sellerLinks.length > 0
    if (!req.user.is_admin && !isBuyer && !isSeller) return res.status(403).json({ success: false, message: 'Forbidden. You are not associated with this order.' })
    const { rows: items } = await pool.query(`
      SELECT oi.*, p.title, p.status as product_status,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as main_image,
             s.full_name as seller_name, s.email as seller_email, s.phone as seller_phone, s.avatar_url as seller_avatar
      FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN users s ON s.id = oi.seller_id
      WHERE oi.order_id = $1 ORDER BY oi.id ASC
    `, [orderId])
    return res.json({ success: true, order: { ...order, items, permissions: { is_buyer: isBuyer, is_seller: isSeller, is_admin: !!req.user.is_admin, can_cancel: ['pending', 'confirmed', 'shipped'].includes(order.status) } } })
  } catch (err) {
    console.error('[getOrderById error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function getSellerOrders(req, res) {
  try {
    const { rows: items } = await pool.query(`
      SELECT oi.*, o.status as order_status, o.shipping_address, o.phone as buyer_phone, o.created_at as order_date,
             o.is_booking, o.booking_amount,
             p.title, p.category, p.status as product_status,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as main_image,
             u.full_name as buyer_name, u.email as buyer_email
      FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id JOIN users u ON o.buyer_id = u.id
      WHERE oi.seller_id = $1 ORDER BY o.created_at DESC
    `, [req.user.id])
    return res.json({ success: true, orders: items })
  } catch (err) {
    console.error('[getSellerOrders error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function updateOrderStatus(req, res) {
  const { status, cancellation_reason = '', cancellation_note = '', acknowledged_consequences = false } = req.body || {}
  const validStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled']
  if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' })
  try {
    const { rows: orders } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id])
    if (orders.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' })
    const order = orders[0]
    const isBuyer = order.buyer_id === req.user.id
    const { rows: sellerItems } = await pool.query('SELECT id FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1', [req.params.id, req.user.id])
    const isSeller = sellerItems.length > 0
    if (!req.user.is_admin && !isBuyer && !isSeller) return res.status(403).json({ success: false, message: 'Forbidden. You are not associated with this order.' })
    if (!req.user.is_admin && !isSeller && status !== 'cancelled') return res.status(403).json({ success: false, message: 'Buyers can only cancel orders.' })
    if (order.status === status) return res.json({ success: true, message: `Order is already ${status}.` })
    if (status === 'cancelled') {
      if (!['pending', 'confirmed', 'shipped'].includes(order.status)) return res.status(400).json({ success: false, message: 'This order can no longer be cancelled.' })
      if (!cancellation_reason || typeof cancellation_reason !== 'string') return res.status(400).json({ success: false, message: 'Cancellation reason is required.' })
      if (!acknowledged_consequences) return res.status(400).json({ success: false, message: 'You must agree to cancellation consequences.' })
      if (cancellation_reason === 'others' && !String(cancellation_note || '').trim()) return res.status(400).json({ success: false, message: 'Please provide cancellation details for Others.' })
    }
    if (status === 'cancelled') {
      await pool.query('UPDATE orders SET status = $1, cancellation_reason = $2, cancellation_note = $3, cancelled_by = $4 WHERE id = $5', [status, cancellation_reason, String(cancellation_note || '').trim() || null, req.user.id, req.params.id])
    } else {
      await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id])
    }
    let reopenedProducts = 0, pointsDeducted = 0, reviewsRemoved = 0
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const { rows: orderItems } = await pool.query('SELECT product_id FROM order_items WHERE order_id = $1', [req.params.id])
      for (const item of orderItems) {
        const result = await pool.query(`UPDATE products SET status = 'approved' WHERE id = $1 AND status IN ('sold', 'booked')`, [item.product_id])
        reopenedProducts += result.rowCount || 0
      }
      const { rows: totalRows } = await pool.query('SELECT COALESCE(SUM(price * quantity), 0) as item_total FROM order_items WHERE order_id = $1', [req.params.id])
      const earnedPoints = Math.floor(Number(totalRows[0].item_total || 0) / 100) * 10
      if (earnedPoints > 0) { await pool.query('UPDATE users SET points = GREATEST(points - $1, 0) WHERE id = $2', [earnedPoints, order.buyer_id]); pointsDeducted = earnedPoints }
      const deletedReviews = await pool.query('DELETE FROM reviews WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1)', [req.params.id])
      reviewsRemoved = deletedReviews.rowCount || 0
    }
    const statusMessages = { shipped: 'Your order has been shipped! 📦', delivered: 'Your order has been delivered! 🎉', cancelled: 'Your order has been cancelled.' }
    if (statusMessages[status] && status !== 'cancelled') {
      createNotification(orders[0].buyer_id, 'order', statusMessages[status], `Order #${req.params.id} status updated to ${status}.`, `/orders/${req.params.id}`)
    }
    if (status === 'cancelled') {
      const { rows: actorRows } = await pool.query('SELECT full_name FROM users WHERE id = $1 LIMIT 1', [req.user.id])
      const actorRole = req.user.is_admin ? 'Admin' : (isBuyer ? 'Buyer' : 'Seller')
      const actorName = actorRows[0]?.full_name || actorRole
      const reasonMap = isBuyer ? BUYER_CANCELLATION_REASONS : SELLER_CANCELLATION_REASONS
      const reasonLabel = reasonMap[cancellation_reason] || cancellation_reason
      const reasonDetails = cancellation_reason === 'others' ? String(cancellation_note || '').trim() : ''
      const reportBody = [`Order #${req.params.id} was cancelled by ${actorName} (${actorRole}).`, `Reason: ${reasonLabel}${reasonDetails ? ` — ${reasonDetails}` : ''}`, `Products restored to active: ${reopenedProducts}`, `Buyer points deducted: ${pointsDeducted}`, `Reviews removed: ${reviewsRemoved}`].join('\n')
      if (isBuyer) {
        const { rows: sellerRows } = await pool.query('SELECT DISTINCT seller_id FROM order_items WHERE order_id = $1', [req.params.id])
        for (const row of sellerRows) { createNotification(row.seller_id, 'order', 'Order Cancelled by Buyer', reportBody, `/orders/${req.params.id}`) }
      } else if (isSeller) {
        createNotification(order.buyer_id, 'order', 'Order Cancelled by Seller', reportBody, `/orders/${req.params.id}`)
      } else if (req.user.is_admin) {
        createNotification(order.buyer_id, 'order', 'Order Cancelled by Admin', reportBody, `/orders/${req.params.id}`)
        const { rows: sellerRows } = await pool.query('SELECT DISTINCT seller_id FROM order_items WHERE order_id = $1', [req.params.id])
        for (const row of sellerRows) { createNotification(row.seller_id, 'order', 'Order Cancelled by Admin', reportBody, `/orders/${req.params.id}`) }
      }
    }
    return res.json({ success: true, message: `Order status updated to ${status}.` })
  } catch (err) {
    console.error('[updateOrderStatus error]', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

async function placeBooking(req, res) {
  if (!req.user.nid_verified) {
    return res.status(403).json({ success: false, message: 'NID verification is required to book properties.' })
  }
  const { product_id, booking_amount, phone, note } = req.body
  if (!product_id || !booking_amount || !phone) return res.status(400).json({ success: false, message: 'Product ID, booking amount, and phone are required.' })
  const amount = parseFloat(booking_amount)
  if (isNaN(amount) || amount < 500) return res.status(400).json({ success: false, message: 'Minimum booking amount is ৳500.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: prods } = await client.query('SELECT id, title, price, category, status, seller_id, location FROM products WHERE id = $1 FOR UPDATE', [product_id])
    if (prods.length === 0) { await client.query('ROLLBACK'); client.release(); return res.status(404).json({ success: false, message: 'Product not found.' }) }
    const prod = prods[0]
    if (prod.category !== 'house_rent') { await client.query('ROLLBACK'); client.release(); return res.status(400).json({ success: false, message: 'Booking is only available for rental properties.' }) }
    if (prod.status !== 'approved') { await client.query('ROLLBACK'); client.release(); return res.status(400).json({ success: false, message: 'This property is no longer available.' }) }
    if (prod.seller_id === req.user.id) { await client.query('ROLLBACK'); client.release(); return res.status(400).json({ success: false, message: 'You cannot book your own property.' }) }
    const totalAmount = amount
    const earnedPoints = Math.floor(amount / 100) * 10
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (buyer_id, status, total_amount, delivery_fee, shipping_address, phone, note, is_booking, booking_amount) VALUES ($1, 'confirmed', $2, 0, $3, $4, $5, true, $6) RETURNING id`,
      [req.user.id, totalAmount, prod.location, phone.trim(), note?.trim() || null, amount]
    )
    const orderId = orderRows[0].id
    await client.query('INSERT INTO order_items (order_id, product_id, seller_id, price, quantity, is_booking, booking_amount) VALUES ($1, $2, $3, $4, 1, true, $5)', [orderId, prod.id, prod.seller_id, prod.price, amount])
    await client.query(`UPDATE products SET status = 'booked' WHERE id = $1 AND status = 'approved'`, [prod.id])
    if (earnedPoints > 0) { await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [earnedPoints, req.user.id]) }
    await client.query('COMMIT')
    client.release()
    const { rows: buyers } = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id])
    const buyerName = buyers[0]?.full_name || 'A buyer'
    notifyBestEffort(prod.seller_id, 'order', 'New Booking Received! 🏠', `${buyerName} placed an advance booking of ৳${amount.toLocaleString()} for "${prod.title}".`, `/orders/${orderId}`)
    notifyBestEffort(req.user.id, 'order', 'Booking Confirmed! ✅', `Your advance booking of ৳${amount.toLocaleString()} for "${prod.title}" has been confirmed. Order #${orderId}.`, `/orders/${orderId}`)
    if (earnedPoints > 0) { notifyBestEffort(req.user.id, 'system', 'Reward Points Earned! 🎁', `You earned ${earnedPoints} points from your booking.`, `/orders/${orderId}`) }
    return res.status(201).json({ success: true, message: 'Booking placed successfully!', orderId, total: totalAmount, earnedPoints })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    client.release()
    console.error('[placeBooking error]', err)
    return res.status(500).json({ success: false, message: 'Failed to place booking.' })
  }
}

module.exports = { placeOrder, placeBooking, getMyOrders, getSellerOrders, getOrderById, updateOrderStatus }
