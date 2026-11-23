CREATE TABLE IF NOT EXISTS traffic_period (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS traffic_visitor_days (
  period_start TIMESTAMPTZ NOT NULL,
  day DATE NOT NULL,
  visitor_key TEXT NOT NULL CHECK (length(visitor_key) = 64),
  source TEXT NOT NULL CHECK (source IN ('direct', 'instagram', 'google', 'other')),
  views INTEGER NOT NULL DEFAULT 1 CHECK (views > 0),
  last_seen TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (period_start, day, visitor_key)
);
CREATE TABLE IF NOT EXISTS traffic_archives (
  id BIGSERIAL PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL UNIQUE,
  ends_at TIMESTAMPTZ NOT NULL,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
