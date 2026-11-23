import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { adminGuard } from "@/lib/admin-access";
import { getMediaBucket, IMAGE_LIMIT, VIDEO_LIMIT, matchesMediaSignature, mediaTypes, readUpload } from "@/lib/media-server";
import { voteResponse } from "@/lib/voting-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const assets = await getDb().select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(100);
    return voteResponse({ assets: assets.map(asset => ({ ...asset, src: `/api/media/${asset.id}` })) });
  } catch { return voteResponse({ error: "Medya kütüphanesi yüklenemedi." }, 503); }
}

export async function POST(request: Request) {
  const denied = await adminGuard(request, true); if (denied) return denied;
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  const format = mediaTypes[contentType];
  if (!format) return voteResponse({ error: "PNG, JPG, WebP, AVIF, GIF, MP4 veya WebM dosyası seç." }, 415);
  const limit = format.kind === "image" ? IMAGE_LIMIT : VIDEO_LIMIT;
  let bytes: Uint8Array;
  try { bytes = await readUpload(request, limit); }
  catch (error) { return voteResponse({ error: error instanceof RangeError ? `Dosya en fazla ${limit / (1024 * 1024)} MB olabilir.` : "Dosya okunamadı." }, error instanceof RangeError ? 413 : 400); }
  if (!matchesMediaSignature(bytes, contentType)) return voteResponse({ error: "Dosyanın içeriği seçilen biçimle eşleşmiyor." }, 400);
  const id = `${crypto.randomUUID()}.${format.extension}`;
  const name = (new URL(request.url).searchParams.get("name") ?? `Yüklenen ${format.kind === "image" ? "görsel" : "video"}`).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120);
  const asset = { id, kind: format.kind, contentType, size: bytes.byteLength, name, createdAt: new Date().toISOString() };
  try {
    const bucket = getMediaBucket();
    await bucket.put(id, bytes, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });
    try { await getDb().insert(mediaAssets).values(asset); }
    catch (error) { await bucket.delete(id); throw error; }
    return voteResponse({ asset: { ...asset, src: `/api/media/${id}` } }, 201);
  } catch { return voteResponse({ error: "Dosya yüklenemedi. Lütfen tekrar dene." }, 503); }
}
