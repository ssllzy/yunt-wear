CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY NOT NULL, expires_at INTEGER NOT NULL, credential_version TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_limits_expiry ON login_limits(expires_at);
