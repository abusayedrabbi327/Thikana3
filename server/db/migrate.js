/**
 * migrate.js
 * Run the init.sql schema on Supabase (PostgreSQL).
 * Usage: node server/db/migrate.js
 * 
 * Since we're starting fresh on Supabase, this script simply runs
 * the init.sql to create all tables. For existing databases, 
 * PostgreSQL's IF NOT EXISTS clauses prevent duplicate creation.
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const pool = require('../config/db')

async function migrate() {
  console.log('Running PostgreSQL migration…\n')

  try {
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8')
    await pool.query(initSql)
    console.log('✅ All tables created successfully on Supabase.')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  }

  console.log('\nMigration complete.')
  process.exit(0)
}

migrate().catch(err => {
  console.error(err)
  process.exit(1)
})
