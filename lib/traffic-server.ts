import type { TrafficSource } from "./traffic-report";

function implementation() {
  return process.env.YUNT_CLOUDFLARE_BUILD === "1"
    ? import("./cloudflare-traffic")
    : import("./netlify/traffic");
}

export async function recordVisit(visitorKey: string, source: TrafficSource) {
  return (await implementation()).recordVisit(visitorKey, source);
}

export async function readTrafficReport() {
  return (await implementation()).readTrafficReport();
}

export async function readTrafficArchive(id: number) {
  return (await implementation()).readTrafficArchive(id);
}
