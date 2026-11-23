CREATE TABLE traffic_period (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL CHECK (ends_at > starts_at)
);
CREATE TABLE traffic_visitor_days (
  period_start TEXT NOT NULL,
  day TEXT NOT NULL,
  visitor_key TEXT NOT NULL CHECK (length(visitor_key) = 64),
  source TEXT NOT NULL CHECK (source IN ('direct', 'instagram', 'google', 'other')),
  views INTEGER NOT NULL CHECK (views > 0),
  last_seen TEXT NOT NULL,
  PRIMARY KEY (period_start, day, visitor_key)
);
CREATE TABLE traffic_archives (
  id INTEGER PRIMARY KEY,
  starts_at TEXT NOT NULL UNIQUE,
  ends_at TEXT NOT NULL,
  report TEXT NOT NULL CHECK (json_valid(report)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE VIEW traffic_summaries AS
SELECT starts_at,
  json_object(
    'start', starts_at, 'end', ends_at,
    'views', (SELECT coalesce(sum(views),0) FROM traffic_visitor_days WHERE period_start=starts_at),
    'visitors', (SELECT count(DISTINCT visitor_key) FROM traffic_visitor_days WHERE period_start=starts_at),
    'daily', (SELECT json_group_array(json_object('date',day,'views',views,'visitors',visitors))
      FROM (SELECT day,sum(views) AS views,count(*) AS visitors FROM traffic_visitor_days
        WHERE period_start=starts_at GROUP BY day ORDER BY day)),
    'sources', (SELECT json_group_array(json_object('source',source,'views',views,'visitors',visitors))
      FROM (SELECT source,sum(views) AS views,count(DISTINCT visitor_key) AS visitors FROM traffic_visitor_days
        WHERE period_start=starts_at GROUP BY source ORDER BY views DESC,source))
  ) AS report
FROM traffic_period;
CREATE TRIGGER archive_traffic_period
BEFORE UPDATE OF starts_at ON traffic_period
WHEN NEW.starts_at <> OLD.starts_at
BEGIN
  INSERT INTO traffic_archives(starts_at,ends_at,report)
    SELECT OLD.starts_at,OLD.ends_at,report FROM traffic_summaries WHERE starts_at=OLD.starts_at;
  DELETE FROM traffic_visitor_days WHERE period_start=OLD.starts_at;
END;
