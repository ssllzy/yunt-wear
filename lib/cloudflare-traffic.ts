import { env } from "cloudflare:workers";
import type { TrafficReport, TrafficSource, TrafficSummary } from "./traffic-report";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const dateInTurkey = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" });
function database() {
  if (!env.DB) throw new Error("D1 binding unavailable");
  return env.DB;
}

function periodStatements(db: D1Database, now: Date) {
  const timestamp = now.toISOString();
  return [
    db.prepare("INSERT INTO traffic_period VALUES(1, ?, ?) ON CONFLICT(id) DO NOTHING")
      .bind(timestamp, new Date(+now + PERIOD_MS).toISOString()),
    db.prepare(`UPDATE traffic_period SET
        starts_at = strftime('%Y-%m-%dT%H:%M:%fZ', ends_at, '+' || (CAST((unixepoch(?)-unixepoch(ends_at))/2592000 AS INTEGER)*30) || ' days'),
        ends_at = strftime('%Y-%m-%dT%H:%M:%fZ', ends_at, '+' || ((CAST((unixepoch(?)-unixepoch(ends_at))/2592000 AS INTEGER)+1)*30) || ' days')
      WHERE id=1 AND ends_at <= ?`).bind(timestamp, timestamp, timestamp),
  ];
}

export async function recordVisit(visitorKey: string, source: TrafficSource, now = new Date()) {
  const db = database();
  await db.batch([
    ...periodStatements(db, now),
    db.prepare(`INSERT INTO traffic_visitor_days(period_start,day,visitor_key,source,views,last_seen)
      SELECT starts_at,?,?,?,1,? FROM traffic_period WHERE id=1
      ON CONFLICT(period_start,day,visitor_key) DO UPDATE SET views=views+1,last_seen=excluded.last_seen
      WHERE traffic_visitor_days.last_seen <= ?`).bind(
        dateInTurkey.format(now), visitorKey, source, now.toISOString(), new Date(+now - 10000).toISOString(),
      ),
  ]);
}

export async function archiveExpiredTraffic(now = new Date(), db = database()) {
  await db.batch(periodStatements(db, now));
}

export async function readTrafficReport(now = new Date()): Promise<TrafficReport> {
  const db = database();
  const [, , current, archives] = await db.batch([
    ...periodStatements(db, now),
    db.prepare("SELECT report FROM traffic_summaries"),
    db.prepare(`SELECT id, starts_at AS start, ends_at AS end,
        json_extract(report,'$.views') AS views, json_extract(report,'$.visitors') AS visitors
      FROM traffic_archives ORDER BY starts_at DESC LIMIT 120`),
  ]);
  return {
    current: JSON.parse((current.results[0] as { report: string }).report) as TrafficSummary,
    archives: archives.results as TrafficReport["archives"],
  };
}

export async function readTrafficArchive(id: number): Promise<TrafficSummary | null> {
  const row = await database().prepare("SELECT report FROM traffic_archives WHERE id=?").bind(id).first<{ report: string }>();
  return row ? JSON.parse(row.report) as TrafficSummary : null;
}
