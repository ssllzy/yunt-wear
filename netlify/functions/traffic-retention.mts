import { archiveExpiredTraffic } from "../../lib/netlify/traffic";

export default async () => {
  await archiveExpiredTraffic();
  return new Response(null, { status: 204 });
};
// Also rotate on incoming visits and report reads, in case a scheduled run is delayed.
export const config = { schedule: "@hourly" };
