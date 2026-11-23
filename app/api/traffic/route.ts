import { createHmac, randomUUID } from "node:crypto";
import { hasAdminAccess } from "@/lib/admin-access";
import { recordVisit } from "@/lib/traffic-server";
import { requestOrigin } from "@/lib/request-origin";
import { trafficSource } from "@/lib/traffic-report";
import { isSameOriginMutation, readSmallJson, voteResponse } from "@/lib/voting-server";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return voteResponse({ error: "Geçersiz kaynak." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return voteResponse({ error: "JSON gerekli." }, 415);
  if (Number(request.headers.get("content-length")) > 2048) return voteResponse({ error: "İstek çok büyük." }, 413);
  let payload: unknown;
  try { payload = await readSmallJson(request, 2048); }
  catch (error) { return voteResponse({ error: "Geçersiz istek." }, error instanceof RangeError ? 413 : 400); }
  if (!payload || typeof payload !== "object" || !("referrer" in payload) || typeof payload.referrer !== "string" || payload.referrer.length > 1500) return voteResponse({ error: "Geçersiz istek." }, 400);
  // Ignore known crawlers and the editor's own previews. Never persist network addresses.
  if (/bot|crawl|spider|headless|preview/i.test(request.headers.get("user-agent") ?? "") || await hasAdminAccess(request)) return voteResponse({ ok: true });
  const secret = process.env.YUNT_SESSION_SECRET;
  if (!secret || secret.length < 32) return voteResponse({ error: "İstatistik kullanılamıyor." }, 503);
  const secure = requestOrigin(request)?.startsWith("https:");
  const name = secure ? "__Host-yunt_traffic" : "yunt_traffic";
  const existing = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(name + "="))?.slice(name.length + 1);
  const valid = existing && /^[a-f0-9-]{36}$/i.test(existing) ? existing : null;
  const identity = valid ?? randomUUID();
  const key = createHmac("sha256", secret).update("traffic:" + identity).digest("hex");
  try {
    await recordVisit(key, trafficSource(payload.referrer, requestOrigin(request)!));
    return voteResponse({ ok: true }, 200, valid ? undefined : `${name}=${identity}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`);
  } catch { return voteResponse({ error: "İstatistik kaydedilemedi." }, 503); }
}
