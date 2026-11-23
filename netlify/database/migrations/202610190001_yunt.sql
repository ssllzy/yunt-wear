CREATE TABLE IF NOT EXISTS design_votes (voter_key TEXT PRIMARY KEY, design_id TEXT NOT NULL CHECK(design_id IN ('design-01','design-02','design-03','design-04','design-05')));
CREATE INDEX IF NOT EXISTS design_votes_design_idx ON design_votes(design_id);
CREATE TABLE IF NOT EXISTS newsletter_subscribers (voter_key TEXT PRIMARY KEY REFERENCES design_votes(voter_key), email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, discount_percent INTEGER NOT NULL DEFAULT 20 CHECK(discount_percent=20), consent_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text), consent_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS site_documents (id TEXT PRIMARY KEY, draft TEXT NOT NULL, published TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, published_at TEXT);
CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at BIGINT NOT NULL, credential_version TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS login_limits_expiry ON login_limits(expires_at);
