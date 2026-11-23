import { getNetlifyDatabase } from "./connection";
import type { TrafficReport, TrafficSource, TrafficSummary } from "../traffic-report";

async function connectTraffic() { return getNetlifyDatabase().pool.connect(); }
type Client = Awaited<ReturnType<typeof connectTraffic>>;
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const iso = (value: string | Date) => new Date(value).toISOString();

async function summary(client: Client, start: string, end: string): Promise<TrafficSummary> {
  const totals = await client.query("SELECT COALESCE(SUM(views),0)::int AS views, COUNT(DISTINCT visitor_key)::int AS visitors FROM traffic_visitor_days WHERE period_start=$1", [start]);
  const daily = await client.query("SELECT to_char(day,'YYYY-MM-DD') AS date, SUM(views)::int AS views, COUNT(*)::int AS visitors FROM traffic_visitor_days WHERE period_start=$1 GROUP BY day ORDER BY day", [start]);
  const sources = await client.query("SELECT source, SUM(views)::int AS views, COUNT(DISTINCT visitor_key)::int AS visitors FROM traffic_visitor_days WHERE period_start=$1 GROUP BY source ORDER BY SUM(views) DESC, source", [start]);
  return { start, end, views: totals.rows[0].views, visitors: totals.rows[0].visitors, daily: daily.rows, sources: sources.rows };
}

async function currentPeriod(client: Client, now: Date) {
  // The singleton lock serializes a period rollover with incoming visits.
  await client.query("INSERT INTO traffic_period(id,starts_at,ends_at) VALUES(1,$1,$2) ON CONFLICT(id) DO NOTHING", [now.toISOString(), new Date(+now + PERIOD_MS).toISOString()]);
  const { rows: [period] } = await client.query("SELECT starts_at,ends_at FROM traffic_period WHERE id=1 FOR UPDATE");
  let start = iso(period.starts_at), end = iso(period.ends_at);
  if (+now >= +new Date(end)) {
    const report = await summary(client, start, end);
    // Archive and deletion commit together. If either fails, all original rows survive.
    await client.query("INSERT INTO traffic_archives(starts_at,ends_at,report) VALUES($1,$2,$3::jsonb)", [start, end, JSON.stringify(report)]);
    await client.query("DELETE FROM traffic_visitor_days WHERE period_start=$1", [start]);
    const skipped = Math.floor((+now - +new Date(end)) / PERIOD_MS);
    start = new Date(+new Date(end) + skipped * PERIOD_MS).toISOString();
    end = new Date(+new Date(start) + PERIOD_MS).toISOString();
    await client.query("UPDATE traffic_period SET starts_at=$1,ends_at=$2 WHERE id=1", [start, end]);
  }
  return { start, end };
}

export async function trafficTransaction<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  const client = await getNetlifyDatabase().pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout='15s'");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function recordVisit(visitorKey: string, source: TrafficSource, now = new Date()) {
  return trafficTransaction(async client => {
    const period = await currentPeriod(client, now);
    await client.query(`INSERT INTO traffic_visitor_days(period_start,day,visitor_key,source,views,last_seen)
      VALUES($1,($2::timestamptz AT TIME ZONE 'Europe/Istanbul')::date,$3,$4,1,$2)
      ON CONFLICT(period_start,day,visitor_key) DO UPDATE SET views=traffic_visitor_days.views+1,last_seen=EXCLUDED.last_seen
      WHERE traffic_visitor_days.last_seen <= EXCLUDED.last_seen - INTERVAL '10 seconds'`, [period.start, now.toISOString(), visitorKey, source]);
  });
}
export async function archiveExpiredTraffic(now = new Date()) {
  return trafficTransaction(client => currentPeriod(client, now));
}
export async function readTrafficReport(now = new Date()): Promise<TrafficReport> {
  return trafficTransaction(async client => {
    const period = await currentPeriod(client, now);
    const current = await summary(client, period.start, period.end);
    const archives = await client.query("SELECT id,starts_at,ends_at,(report->>'views')::int AS views,(report->>'visitors')::int AS visitors FROM traffic_archives ORDER BY starts_at DESC LIMIT 120");
    return { current, archives: archives.rows.map((row: { id: string; starts_at: Date; ends_at: Date; views: number; visitors: number }) => ({ id: Number(row.id), start: iso(row.starts_at), end: iso(row.ends_at), views: row.views, visitors: row.visitors })) };
  });
}
export async function readTrafficArchive(id: number): Promise<TrafficSummary | null> {
  const result = await getNetlifyDatabase().pool.query("SELECT report FROM traffic_archives WHERE id=$1", [id]);
  return result.rows[0]?.report ?? null;
}
