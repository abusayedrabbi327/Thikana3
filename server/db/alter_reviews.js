const pool = require('../config/db')

async function runAlter() {
  console.log('⏳ Checking and updating reviews database columns...')
  try {
    await pool.query(`
      ALTER TABLE reviews 
      ADD COLUMN IF NOT EXISTS sentiment_label VARCHAR(10) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC(3,2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS nlp_insights TEXT DEFAULT NULL;
    `)
    console.log('✅ Database columns for review sentiment analysis verified/created.')
  } catch (err) {
    console.error('❌ Failed to update reviews table columns:', err.message)
    throw err
  }
}

if (require.main === module) {
  runAlter()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { runAlter }
