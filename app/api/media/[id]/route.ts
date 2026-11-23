import { getMediaBucket } from "@/lib/media-server";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const validId = /^[a-f0-9-]{36}\.(png|jpg|webp|gif|avif|mp4|webm)$/;

async function serve(request: Request, context: Context, headOnly = false) {
  const { id } = await context.params;
  if (!validId.test(id)) return new Response("Bulunamadı", { status: 404 });
  try {
    const bucket = getMediaBucket();
    const meta = await bucket.head(id);
    if (!meta) return new Response("Bulunamadı", { status: 404 });
    const headers = new Headers({ "Content-Type": meta.httpMetadata?.contentType ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes", ETag: meta.httpEtag, "X-Content-Type-Options": "nosniff" });
    if (request.headers.get("if-none-match") === meta.httpEtag) return new Response(null, { status: 304, headers });
    let offset = 0; let length = meta.size; let status = 200;
    const range = request.headers.get("range");
    if (range && (!request.headers.has("if-range") || request.headers.get("if-range") === meta.httpEtag)) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) { headers.set("Content-Range", `bytes */${meta.size}`); return new Response(null, { status: 416, headers }); }
      let end: number;
      if (!match[1]) { const suffix = Number(match[2]); offset = Math.max(0, meta.size - suffix); end = meta.size - 1; }
      else { offset = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), meta.size - 1) : meta.size - 1; }
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset >= meta.size || end < offset) { headers.set("Content-Range", `bytes */${meta.size}`); return new Response(null, { status: 416, headers }); }
      end = Math.min(end, offset + 3 * 1024 * 1024 - 1);
      length = end - offset + 1; status = 206;
      headers.set("Content-Range", `bytes ${offset}-${end}/${meta.size}`);
    }
    headers.set("Content-Length", String(length));
    if (headOnly) return new Response(null, { status, headers });
    const object = await bucket.get(id, status === 206 ? { range: { offset, length } } : undefined);
    return new Response(object?.body ?? null, { status, headers });
  } catch { return new Response("Dosya şu anda yüklenemiyor.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
export const GET = (request: Request, context: Context) => serve(request, context);
export const HEAD = (request: Request, context: Context) => serve(request, context, true);
