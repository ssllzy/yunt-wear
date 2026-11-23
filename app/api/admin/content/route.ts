import { z } from "zod";
import { adminGuard } from "@/lib/admin-access";
import { readContentState, writeContent } from "@/lib/content-server";
import { contentValidationMessage, siteContentSchema } from "@/lib/site-content";
import { readSmallJson, voteResponse } from "@/lib/voting-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { return voteResponse(await readContentState()); }
  catch { return voteResponse({ error: "Site ayarları şu anda yüklenemiyor." }, 503); }
}

const mutationSchema = z.object({ action: z.enum(["save", "publish"]), revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), content: siteContentSchema }).strict();
export async function PUT(request: Request) {
  const denied = await adminGuard(request, true); if (denied) return denied;
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return voteResponse({ error: "JSON biçimi gerekli." }, 415);
  let payload: unknown;
  try { payload = await readSmallJson(request, 256 * 1024); }
  catch (error) { return voteResponse({ error: error instanceof RangeError ? "İçerik çok büyük." : "İçerik okunamadı." }, error instanceof RangeError ? 413 : 400); }
  const parsed = mutationSchema.safeParse(payload);
  if (!parsed.success) return voteResponse({ error: contentValidationMessage(parsed.error) }, 400);
  try {
    const { content, revision, action } = parsed.data;
    const current = await readContentState();
    if (current.revision !== revision) return voteResponse({ error: "Başka bir sekmede değişiklik kaydedilmiş. İçeriği yeniden yükleyip tekrar dene." }, 409);
    const ids = new Set(content.products.map(product => product.id));
    if (current.published.products.some(product => !ids.has(product.id))) {
      return voteResponse({ error: "Yayınlanan bir ürünü kaldırmak için görünürlüğünü kapat." }, 400);
    }
    const saved = await writeContent(content, revision, action === "publish");
    if (!saved) return voteResponse({ error: "Başka bir sekmede değişiklik kaydedilmiş. İçeriği yeniden yükleyip tekrar dene." }, 409);
    return voteResponse(saved);
  } catch { return voteResponse({ error: "Değişiklikler kaydedilemedi. Biraz sonra tekrar dene." }, 503); }
}
