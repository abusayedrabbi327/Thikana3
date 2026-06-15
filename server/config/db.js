const { Pool } = require('pg')
require('dotenv').config()

/**
 * PostgreSQL connection pool (Supabase).
 * Uses DATABASE_URL from .env
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Test the connection on startup and execute migration queries to ensure columns can hold base64 data URLs
pool.query('SELECT NOW()')
  .then(async () => {
    console.log('✅ PostgreSQL connected — Supabase')
    try {
      await pool.query('ALTER TABLE product_images ALTER COLUMN image_url TYPE TEXT')
      await pool.query('ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT')
      console.log('✅ Database schema updated (columns altered to TEXT for base64 storage)')
    } catch (dbErr) {
      console.warn('⚠️ Database schema update warning:', dbErr.message)
    }
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection failed:', err)
    process.exit(1)
  })

// Prevent unhandled client errors from crashing the process
pool.on('error', (err, client) => {
  console.error('[pg pool] unexpected client error', err && err.message ? err.message : err)
  // Do not exit here; log and allow the pool to manage reconnections.
})

module.exports = pool
