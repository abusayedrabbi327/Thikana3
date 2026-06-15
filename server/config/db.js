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

// Test the connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ PostgreSQL connected — Supabase')
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
