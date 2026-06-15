const pool = require('../config/db')

const DEFAULT_ADMIN_SETTINGS = {
  verification_thresholds: {
    auto_approve_score: 90,
    manual_review_score: 70,
    min_face_match_score: 75,
    min_ocr_confidence: 70,
  },
  moderation_settings: {
    auto_flag_duplicate_titles: true,
    require_note_on_reject: true,
    max_pending_days: 7,
  },
  upload_limits: {
    max_product_images: 8,
    max_image_size_mb: 8,
    max_kyc_image_size_mb: 10,
  },
  notification_settings: {
    email_on_kyc_review: true,
    email_on_product_review: true,
    in_app_admin_alerts: true,
  },
  security_settings: {
    force_strong_passwords: true,
    max_login_attempts: 5,
    lockout_minutes: 30,
  },
}

const CACHE_MS = 30 * 1000
let cache = null
let cacheAt = 0

function hydrateSettings(config = {}) {
  const merged = {
    verification_thresholds: { ...DEFAULT_ADMIN_SETTINGS.verification_thresholds, ...(config.verification_thresholds || {}) },
    moderation_settings: { ...DEFAULT_ADMIN_SETTINGS.moderation_settings, ...(config.moderation_settings || {}) },
    upload_limits: { ...DEFAULT_ADMIN_SETTINGS.upload_limits, ...(config.upload_limits || {}) },
    notification_settings: { ...DEFAULT_ADMIN_SETTINGS.notification_settings, ...(config.notification_settings || {}) },
    security_settings: { ...DEFAULT_ADMIN_SETTINGS.security_settings, ...(config.security_settings || {}) },
  }

  // Backward-compatible alias support.
  if (merged.verification_thresholds.min_manual_review_score == null) {
    merged.verification_thresholds.min_manual_review_score = merged.verification_thresholds.manual_review_score
  }
  if (merged.verification_thresholds.manual_review_score == null) {
    merged.verification_thresholds.manual_review_score = merged.verification_thresholds.min_manual_review_score
  }

  return merged
}

async function getAdminRuntimeSettings({ force = false } = {}) {
  const now = Date.now()
  if (!force && cache && (now - cacheAt) < CACHE_MS) return cache
  try {
    const { rows } = await pool.query('SELECT config FROM admin_settings WHERE id = 1 LIMIT 1')
    const settings = hydrateSettings(rows[0]?.config || {})
    cache = settings
    cacheAt = now
    return settings
  } catch (_err) {
    // Fallback to defaults if table does not exist yet during bootstrapping.
    const settings = hydrateSettings({})
    cache = settings
    cacheAt = now
    return settings
  }
}

function invalidateAdminSettingsCache() {
  cache = null
  cacheAt = 0
}

module.exports = {
  DEFAULT_ADMIN_SETTINGS,
  hydrateSettings,
  getAdminRuntimeSettings,
  invalidateAdminSettingsCache,
}
