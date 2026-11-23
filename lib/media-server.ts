import { env } from "cloudflare:workers";

export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const VIDEO_LIMIT = 40 * 1024 * 1024;
export const mediaTypes: Record<string, { kind: "image" | "video"; extension: string }> = {
  "image/png": { kind: "image", extension: "png" }, "image/jpeg": { kind: "image", extension: "jpg" },
  "image/webp": { kind: "image", extension: "webp" }, "image/gif": { kind: "image", extension: "gif" },
  "image/avif": { kind: "image", extension: "avif" }, "video/mp4": { kind: "video", extension: "mp4" },
  "video/webm": { kind: "video", extension: "webm" },
};
export function getMediaBucket() {
  if (!env.BUCKET) throw new Error("Media binding unavailable");
  return env.BUCKET;
}
export function matchesMediaSignature(bytes: Uint8Array, type: string): boolean {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (type === "image/png") return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value);
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (type === "image/avif") return ascii(4, 4) === "ftyp" && /avif|avis/.test(ascii(8, 24));
  if (type === "video/mp4") return bytes.length >= 12 && ascii(4, 4) === "ftyp" && !/avif|avis|heic|heif/.test(ascii(8, 4));
  if (type === "video/webm") return [26,69,223,163].every((value, index) => bytes[index] === value);
  return false;
}
export async function readUpload(request: Request, limit: number): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > limit) throw new RangeError("too large");
  const reader = request.body?.getReader(); if (!reader) throw new SyntaxError("empty");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const next = await reader.read(); if (next.done) break;
    length += next.value.byteLength;
    if (length > limit) { await reader.cancel(); throw new RangeError("too large"); }
    chunks.push(next.value);
  }
  if (!length) throw new SyntaxError("empty");
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
