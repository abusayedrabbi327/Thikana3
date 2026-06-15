-- ─────────────────────────────────────────────────────────
-- Thikana Database Setup (PostgreSQL / Supabase)
-- Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────

-- ─── Helper: auto-update updated_at trigger ─────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                     SERIAL PRIMARY KEY,
  full_name              VARCHAR(100)      NOT NULL,
  email                  VARCHAR(191)      NOT NULL UNIQUE,
  password               VARCHAR(255)      NOT NULL,
  role                   VARCHAR(10)       NOT NULL DEFAULT 'buyer'
                         CHECK (role IN ('buyer','seller','admin')),
  is_verified            BOOLEAN           NOT NULL DEFAULT FALSE,
  nid_verified           BOOLEAN           NOT NULL DEFAULT FALSE,
  is_admin               BOOLEAN           NOT NULL DEFAULT FALSE,
  avatar_url             VARCHAR(500)               DEFAULT NULL,
  phone                  VARCHAR(20)                DEFAULT NULL,
  address                VARCHAR(300)               DEFAULT NULL,
  bio                    TEXT                       DEFAULT NULL,
  otp_code               VARCHAR(6)                 DEFAULT NULL,
  otp_expires_at         TIMESTAMP                  DEFAULT NULL,
  reset_token            VARCHAR(64)                DEFAULT NULL,
  reset_token_expires_at TIMESTAMP                  DEFAULT NULL,
  points                 INTEGER           NOT NULL DEFAULT 0,
  account_status         VARCHAR(12)       NOT NULL DEFAULT 'active'
                         CHECK (account_status IN ('active','suspended','banned')),
  status_note            TEXT                       DEFAULT NULL,
  suspended_until        TIMESTAMP                  DEFAULT NULL,
  created_at             TIMESTAMP         NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP         NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Refresh Tokens ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(512) NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token);

-- Identity Verifications (AI-assisted KYC workflow)
CREATE TABLE IF NOT EXISTS identity_verifications (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nid_number          TEXT         NOT NULL,
  nid_number_hash     VARCHAR(64)  NOT NULL,
  full_name           TEXT                  DEFAULT NULL,
  dob                 DATE                  DEFAULT NULL,
  nid_image_path      VARCHAR(700) NOT NULL,
  selfie_image_path   VARCHAR(700) NOT NULL,
  ocr_confidence      NUMERIC(5,2)          DEFAULT 0,
  face_match_score    NUMERIC(5,2)          DEFAULT 0,
  confidence_score    INTEGER      NOT NULL DEFAULT 0,
  fraud_flags         JSONB        NOT NULL DEFAULT '[]'::jsonb,
  verification_status VARCHAR(12)  NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN ('pending','processing','review','approved','rejected')),
  review_source       VARCHAR(10)  NOT NULL DEFAULT 'auto'
                      CHECK (review_source IN ('auto','manual')),
  reviewed_by         INTEGER               DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  review_note         TEXT                  DEFAULT NULL,
  ai_result           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  processed_at        TIMESTAMP             DEFAULT NULL,
  reviewed_at         TIMESTAMP             DEFAULT NULL,
  purge_after         TIMESTAMP             DEFAULT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_identity_verifications_updated_at ON identity_verifications;
CREATE TRIGGER set_identity_verifications_updated_at
  BEFORE UPDATE ON identity_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_identity_user_created ON identity_verifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_identity_status_created ON identity_verifications(verification_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_identity_nid_hash ON identity_verifications(nid_number_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_active_nid_hash
  ON identity_verifications(nid_number_hash)
  WHERE verification_status IN ('pending','processing','review','approved');

CREATE TABLE IF NOT EXISTS blocked_nids (
  id              SERIAL PRIMARY KEY,
  nid_number      TEXT        NOT NULL,
  nid_number_hash VARCHAR(64) NOT NULL UNIQUE,
  reason          TEXT                 DEFAULT NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_nids_hash ON blocked_nids(nid_number_hash);

-- ─── NID Submissions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS nid_submissions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nid_number      VARCHAR(30)  NOT NULL,
  nid_front_url   VARCHAR(500) NOT NULL,
  nid_selfie_url  VARCHAR(500) NOT NULL,
  status          VARCHAR(10)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  admin_note      TEXT                 DEFAULT NULL,
  reviewed_at     TIMESTAMP            DEFAULT NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ─── Products ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  seller_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    VARCHAR(50)   NOT NULL,
  title       VARCHAR(255)  NOT NULL,
  description TEXT          NOT NULL,
  price       DECIMAL(12,2) NOT NULL,
  location    VARCHAR(255)  NOT NULL,
  lat         DECIMAL(10,8) DEFAULT NULL,
  lng         DECIMAL(11,8) DEFAULT NULL,
  status      VARCHAR(10)   NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected','sold','booked')),
  attributes  JSONB         DEFAULT NULL,
  views       INTEGER       NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_prod_cat_price    ON products(category, status, price);
CREATE INDEX IF NOT EXISTS idx_products_seller   ON products(seller_id);

-- ─── Product Images ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url  VARCHAR(500) NOT NULL,
  is_primary BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Favourites ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favourites (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER   NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ─── Inquiries ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sender_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      TEXT         NOT NULL,
  sender_name  VARCHAR(100) NOT NULL,
  sender_phone VARCHAR(20)  DEFAULT NULL,
  is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Cart Items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER   NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER   NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ─── Orders ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL PRIMARY KEY,
  buyer_id            INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              VARCHAR(12)   NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_fee        DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_booking          BOOLEAN       NOT NULL DEFAULT FALSE,
  booking_amount      DECIMAL(12,2)          DEFAULT NULL,
  shipping_address    VARCHAR(500)  NOT NULL,
  phone               VARCHAR(20)   NOT NULL,
  note                TEXT                   DEFAULT NULL,
  cancellation_reason VARCHAR(100)           DEFAULT NULL,
  cancellation_note   TEXT                   DEFAULT NULL,
  cancelled_by        INTEGER                DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Order Items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id             SERIAL PRIMARY KEY,
  order_id       INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id      INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price          DECIMAL(12,2) NOT NULL,
  quantity       INTEGER       NOT NULL DEFAULT 1,
  is_booking     BOOLEAN       NOT NULL DEFAULT FALSE,
  booking_amount DECIMAL(12,2)          DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_oi_seller_order ON order_items(seller_id, order_id);

-- Add indexes for stats queries
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_favourites_user ON favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer ON reviews(buyer_id);

-- ─── Reviews ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            SERIAL PRIMARY KEY,
  order_item_id INTEGER   NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  buyer_id      INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id     INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id    INTEGER   NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating        INTEGER   NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT      DEFAULT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rev_product ON reviews(product_id, created_at);

-- ─── Messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  INTEGER               DEFAULT NULL REFERENCES products(id) ON DELETE SET NULL,
  content     TEXT                   DEFAULT NULL,
  type        VARCHAR(10)  NOT NULL DEFAULT 'text'
              CHECK (type IN ('text','image','file','voice')),
  file_url    VARCHAR(500)           DEFAULT NULL,
  file_name   VARCHAR(255)           DEFAULT NULL,
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conversation ON messages(sender_id, receiver_id, created_at);

-- ─── Notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50)  NOT NULL DEFAULT 'system',
  title      VARCHAR(255) NOT NULL,
  body       TEXT                  DEFAULT NULL,
  link       VARCHAR(500)          DEFAULT NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);

-- ─── Admin Settings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_by INTEGER              DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

INSERT INTO admin_settings (id, config)
VALUES (
  1,
  '{
    "verification_thresholds":{"auto_approve_score":90,"manual_review_score":70,"min_face_match_score":75,"min_ocr_confidence":70},
    "moderation_settings":{"auto_flag_duplicate_titles":true,"require_note_on_reject":true,"max_pending_days":7},
    "upload_limits":{"max_product_images":8,"max_image_size_mb":8,"max_kyc_image_size_mb":10},
    "notification_settings":{"email_on_kyc_review":true,"email_on_product_review":true,"in_app_admin_alerts":true},
    "security_settings":{"force_strong_passwords":true,"max_login_attempts":5,"lockout_minutes":30}
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ─── Admin Activity Logs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id             SERIAL PRIMARY KEY,
  actor_id       INTEGER      DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  target_user_id INTEGER      DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  entity_type    VARCHAR(30)  NOT NULL,
  entity_id      INTEGER      DEFAULT NULL,
  action         VARCHAR(50)  NOT NULL,
  details        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_logs(created_at DESC);
