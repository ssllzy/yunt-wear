import {
  NEWSLETTER_DISCOUNT_PERCENT,
  parseNewsletterInput,
  subscribeAfterVote,
} from "@/lib/newsletter-server";
import {
  getVoteIdentity,
  isSameOriginMutation,
  readSmallJson,
  voteResponse,
} from "@/lib/voting-server";

export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 2048;

export function GET() {
  const response = voteResponse({ error: "Bu adres yalnızca kayıt için kullanılabilir." }, 405);
  response.headers.set("Allow", "POST");
  return response;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return voteResponse({ error: "Bu kaynaktan kayıt gönderilemiyor." }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return voteResponse({ error: "Kayıt JSON biçiminde gönderilmeli." }, 415);
  }
  if (Number(request.headers.get("content-length")) > MAX_PAYLOAD_BYTES) {
    return voteResponse({ error: "İstek çok büyük." }, 413);
  }

  let payload: unknown;
  try {
    payload = await readSmallJson(request, MAX_PAYLOAD_BYTES);
  } catch (error) {
    return voteResponse(
      { error: error instanceof RangeError ? "İstek çok büyük." : "Kayıt bilgisi okunamadı." },
      error instanceof RangeError ? 413 : 400,
    );
  }
  const input = parseNewsletterInput(payload);
  if (!input) {
    return voteResponse(
      { error: "Geçerli bir e-posta adresi, 2–120 karakterlik ad soyad ve bildirim onayı gerekli." },
      400,
    );
  }

  const identity = await getVoteIdentity(request);
  try {
    const subscribed = await subscribeAfterVote(identity.key, input);
    if (!subscribed) {
      return voteResponse({ error: "Listeye katılmadan önce bir tasarıma oy ver." }, 403, identity.cookie);
    }
    // Do not expose whether an address already existed, or return personal data.
    // This confirms a stored signup/entitlement; no email has been sent here.
    return voteResponse(
      { subscribed: true, discountPercent: NEWSLETTER_DISCOUNT_PERCENT },
      200,
      identity.cookie,
    );
  } catch {
    return voteResponse(
      { error: "Kayıt şu anda tamamlanamıyor. Lütfen biraz sonra tekrar dene." },
      503,
      identity.cookie,
    );
  }
}
