-- Turso/libSQL schema (SQLite-compatible).

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1,
  payment_done INTEGER NOT NULL DEFAULT 0,
  payment_confirmation_email_sent INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT,
  referred_by_user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  referral_rewarded INTEGER NOT NULL DEFAULT 0,
  referral_rewarded_at TEXT,
  login_count INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  terms_accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referral_share_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signup_verifications (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  referred_by_user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  terms_accepted_at TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_verifications (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_documents (
  id TEXT PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_name TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'document' CHECK (kind IN ('document', 'diagram')),
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  command TEXT NOT NULL DEFAULT '',
  points TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  read_label TEXT NOT NULL DEFAULT 'NOTE',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experience_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_referral_code_idx ON app_users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_users_referred_by_idx ON app_users(referred_by_user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS auth_sessions_last_seen_idx ON auth_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS referral_share_events_user_id_idx ON referral_share_events(user_id);
CREATE INDEX IF NOT EXISTS signup_verifications_expiry_idx ON signup_verifications(expires_at);
CREATE INDEX IF NOT EXISTS password_reset_verifications_expiry_idx ON password_reset_verifications(expires_at);
CREATE INDEX IF NOT EXISTS app_users_role_idx ON app_users(role);
CREATE INDEX IF NOT EXISTS content_documents_section_idx ON content_documents(section_id, sort_order, title);
CREATE INDEX IF NOT EXISTS notes_category_id_idx ON notes(category_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS experience_feedback_created_at_idx ON experience_feedback(created_at DESC);
