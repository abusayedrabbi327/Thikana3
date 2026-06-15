const pool = require('../config/db')
const { saveBase64Image } = require('../utils/fileUpload')
const { getAdminRuntimeSettings } = require('../services/adminSettingsService')

async function getPublicStats(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE status = 'approved') AS total_products,
        (SELECT COUNT(*) FROM users WHERE nid_verified = true AND role = 'seller') AS verified_sellers
    `)
    return res.json({ success: true, ...rows[0] })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not fetch stats.' })
  }
}

async function uploadProduct(req, res) {
  const { category, title, description, price, location, lat, lng, attributes, images_base64 } = req.body
  const seller_id = req.user.id
  if (!req.user.nid_verified) {
    return res.status(403).json({ success: false, message: 'NID verification is required to upload products.' })
  }
  if (!category || !title || !price || !location) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' })
  }
  const client = await pool.connect()
  const savedImages = []
  try {
    const runtimeSettings = await getAdminRuntimeSettings()
    const uploadLimits = runtimeSettings.upload_limits || {}
    const maxProductImages = Number(uploadLimits.max_product_images || 8)
    const maxImageSizeMb = Number(uploadLimits.max_image_size_mb || 8)

    await client.query('BEGIN')
    const attrsJson = attributes ? JSON.stringify(attributes) : null
    const { rows: insertRows } = await client.query(
      `INSERT INTO products (seller_id, category, title, description, price, location, lat, lng, attributes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING id`,
      [seller_id, category, title, description || '', price, location, lat || null, lng || null, attrsJson]
    )
    const productId = insertRows[0].id
    if (Array.isArray(images_base64) && images_base64.length > 0) {
      if (images_base64.length > maxProductImages) {
        await client.query('ROLLBACK')
        return res.status(400).json({ success: false, message: `Maximum ${maxProductImages} images allowed.` })
      }
      for (let i = 0; i < images_base64.length; i++) {
        const imageUrl = saveBase64Image(images_base64[i], 'products', `prod-${productId}-${i}`, { maxBytes: maxImageSizeMb * 1024 * 1024 })
        savedImages.push(imageUrl)
        await client.query(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [productId, imageUrl, i === 0]
        )
      }
    }
    await client.query('COMMIT')
    return res.status(201).json({ success: true, message: 'Product uploaded and is pending admin review.', productId })
  } catch (err) {
    await client.query('ROLLBACK')
    savedImages.forEach(url => {
      const { deleteImage } = require('../utils/fileUpload')
      deleteImage(url)
    })
    console.error('[uploadProduct error]', err)
    return res.status(500).json({ success: false, message: 'Failed to upload product.' })
  } finally {
    client.release()
  }
}

async function getProducts(req, res) {
  try {
    const { status, category, seller_id, minPrice, maxPrice, beds, condition, q, sort = 'newest', page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit))
    const pageSize = Math.min(100, parseInt(limit))
    let where = ' WHERE 1=1'
    const params = []
    let paramIndex = 1

    if (status) { where += ` AND p.status = $${paramIndex++}`; params.push(status) }
    if (category) { where += ` AND p.category = $${paramIndex++}`; params.push(category) }
    if (seller_id) { where += ` AND p.seller_id = $${paramIndex++}`; params.push(seller_id) }
    if (minPrice) { where += ` AND p.price >= $${paramIndex++}`; params.push(parseFloat(minPrice)) }
    if (maxPrice) { where += ` AND p.price <= $${paramIndex++}`; params.push(parseFloat(maxPrice)) }
    if (q) {
      const words = q.trim().split(/\s+/)
      where += ' AND ('
      words.forEach((w, index) => {
        if (index > 0) where += ' AND '
        where += `(p.title ILIKE $${paramIndex} OR p.location ILIKE $${paramIndex + 1} OR p.description ILIKE $${paramIndex + 2})`
        params.push(`%${w}%`, `%${w}%`, `%${w}%`)
        paramIndex += 3
      })
      where += ')'
    }
    if (beds) { where += ` AND (p.attributes->>'beds')::int = $${paramIndex++}`; params.push(parseInt(beds)) }
    if (condition) { where += ` AND p.attributes->>'condition' = $${paramIndex++}`; params.push(condition) }

    const orderMap = { newest: 'fbase.created_at DESC', oldest: 'fbase.created_at ASC', price_asc: 'fbase.price ASC', price_desc: 'fbase.price DESC' }
    const orderBy = orderMap[sort] || 'fbase.created_at DESC'
    const includeFavourite = req.user?.role === 'buyer'

    let favouriteSelect, favouriteParams
    if (includeFavourite) {
      favouriteSelect = `EXISTS(SELECT 1 FROM favourites f WHERE f.product_id = fbase.id AND f.user_id = $${paramIndex++}) as is_favourited`
      favouriteParams = [req.user.id]
    } else {
      favouriteSelect = 'false as is_favourited'
      favouriteParams = []
    }

    const baseQuery = `
      WITH filtered AS (
        SELECT p.*,
               u.full_name as seller_name, u.avatar_url as seller_avatar, u.nid_verified as seller_verified,
               (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as main_image
        FROM products p
        JOIN users u ON p.seller_id = u.id
        ${where}
      )
      SELECT fbase.*, ${favouriteSelect}, COUNT(*) OVER() as total_count
      FROM filtered fbase
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`

    const allParams = [...params, ...favouriteParams, pageSize, offset]
    const { rows } = await pool.query(baseQuery, allParams)
    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

    const formatted = rows.map(r => ({
      ...r,
      is_favourited: !!r.is_favourited,
      attributes: r.attributes && typeof r.attributes === 'string' ? JSON.parse(r.attributes) : (r.attributes || {}),
    }))

    return res.json({ success: true, products: formatted, pagination: { total, page: parseInt(page), limit: pageSize, pages: Math.ceil(total / pageSize) } })
  } catch (err) {
    console.error('[getProducts error]', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' })
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params
    const { rows } = await pool.query(`
      SELECT p.*, u.full_name as seller_name, u.avatar_url as seller_avatar,
             u.nid_verified as seller_verified, u.phone as seller_phone, u.email as seller_email
      FROM products p JOIN users u ON p.seller_id = u.id WHERE p.id = $1
    `, [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' })
    const product = rows[0]
    product.attributes = product.attributes && typeof product.attributes === 'string'
      ? JSON.parse(product.attributes) : (product.attributes || {})
    if (!req.user?.nid_verified) { delete product.seller_phone; delete product.seller_email }
    pool.query('UPDATE products SET views = views + 1 WHERE id = $1', [id]).catch(() => {})
    const [imagesResult, relatedResult] = await Promise.all([
      pool.query('SELECT image_url, is_primary FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC', [id]),
      pool.query(`
        SELECT p.id, p.title, p.price, p.location, p.category, p.status,
               (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as main_image,
               u.nid_verified as seller_verified
        FROM products p JOIN users u ON p.seller_id = u.id
        WHERE p.category = $1 AND p.id != $2 AND p.status IN ('approved','sold')
        ORDER BY p.created_at DESC LIMIT 6
      `, [product.category, id])
    ])
    const images = imagesResult.rows
    product.images = images.map(img => img.image_url)
    product.main_image = images.length > 0 ? images[0].image_url : null
    product.related = relatedResult.rows
    return res.json({ success: true, product })
  } catch (err) {
    console.error('[getProductById error]', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch product.' })
  }
}

async function editProduct(req, res) {
  try {
    const { id } = req.params
    const { title, description, price } = req.body
    const seller_id = req.user.id
    const { rows } = await pool.query('SELECT seller_id FROM products WHERE id = $1', [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' })
    if (rows[0].seller_id !== seller_id) return res.status(403).json({ success: false, message: 'Unauthorized to edit this product.' })
    const updates = []
    const params = []
    let pi = 1
    if (title !== undefined) { updates.push(`title = $${pi++}`); params.push(title) }
    if (description !== undefined) { updates.push(`description = $${pi++}`); params.push(description) }
    if (price !== undefined) { updates.push(`price = $${pi++}`); params.push(price) }
    if (updates.length > 0) {
      params.push(id)
      await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${pi}`, params)
    }
    return res.json({ success: true, message: 'Product updated successfully.' })
  } catch (err) {
    console.error('[editProduct error]', err)
    return res.status(500).json({ success: false, message: 'Failed to update product.' })
  }
}

async function reviewProduct(req, res) {
  const { product_id, status, admin_note } = req.body
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' })
  }
  try {
    await pool.query('UPDATE products SET status = $1 WHERE id = $2', [status, product_id])
    return res.json({ success: true, message: `Product marked as ${status}.` })
  } catch (err) {
    console.error('[reviewProduct error]', err)
    return res.status(500).json({ success: false, message: 'Failed to update product.' })
  }
}

module.exports = { uploadProduct, getProducts, getProductById, editProduct, reviewProduct, getPublicStats }
