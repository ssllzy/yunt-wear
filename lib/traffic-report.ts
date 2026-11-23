export type TrafficSource = "direct" | "instagram" | "google" | "other";
export const trafficSourceLabels: Record<TrafficSource, string> = {
  direct: "Doğrudan / kaynak bilinmiyor", instagram: "Instagram", google: "Google", other: "Diğer siteler",
};
export type TrafficSummary = {
  start: string; end: string; views: number; visitors: number;
  daily: { date: string; views: number; visitors: number }[];
  sources: { source: TrafficSource; views: number; visitors: number }[];
};
export type TrafficReport = {
  current: TrafficSummary;
  archives: { id: number; start: string; end: string; views: number; visitors: number }[];
};
export function trafficSource(referrer: string, ownOrigin: string): TrafficSource {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    if (!["http:", "https:"].includes(url.protocol) || url.origin === ownOrigin) return "direct";
    const host = url.hostname.toLowerCase();
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (/^(www\.)?google\.[a-z.]+$/.test(host)) return "google";
    return "other";
  } catch { return "direct"; }
}
export function trafficCsv(report: TrafficSummary): string {
  // Only fixed labels, server dates and numbers are exported: no spreadsheet formulas or identities.
  const rows = [
    ["YUNT ziyaretçi raporu"], ["Dönem başlangıcı (UTC)", report.start], ["Dönem sonu (UTC, hariç)", report.end],
    ["Görüntülenme", report.views], ["Tahmini tekil ziyaretçi", report.visitors], [],
    ["Gün (Türkiye saati)", "Görüntülenme", "Tahmini tekil ziyaretçi"],
    ...report.daily.map(row => [row.date, row.views, row.visitors]), [],
    ["Kaynak", "Görüntülenme", "Tahmini tekil ziyaretçi"],
    ...report.sources.map(row => [trafficSourceLabels[row.source], row.views, row.visitors]), [],
    ["Not", "Çerez silinmesi veya farklı cihaz kullanımı aynı kişiyi tekrar sayabilir. Kaynak ve günlük tekiller toplanarak dönem tekili hesaplanmaz. IP, isim ve e-posta içermez."],
  ];
  return "\uFEFF" + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\r\n") + "\r\n";
}
