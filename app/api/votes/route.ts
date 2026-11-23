import { readPublishedContent } from "@/lib/content-server";
import {
  getVoteIdentity,
  hasAcknowledgedVoteNotice,
  voteNoticeCookie,
  isDesignId,
  isSameOriginMutation,
  readSmallJson,
  readVotes,
  saveVote,
  unavailableVotes,
  voteResponse,
} from "@/lib/voting-server";

export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 1024;

export async function GET(request: Request) {
  const identity = await getVoteIdentity(request);
  try {
    return voteResponse({ ...await readVotes(identity.key), acknowledged: hasAcknowledgedVoteNotice(request) }, 200, identity.cookie);
  } catch {
    return unavailableVotes(identity.cookie);
  }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return voteResponse({ error: "Bu kaynaktan oy gönderilemiyor." }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return voteResponse({ error: "Oy JSON biçiminde gönderilmeli." }, 415);
  }
  if (Number(request.headers.get("content-length")) > MAX_PAYLOAD_BYTES) {
    return voteResponse({ error: "İstek çok büyük." }, 413);
  }

  let payload: unknown;
  try {
    payload = await readSmallJson(request);
  } catch (error) {
    return voteResponse(
      { error: error instanceof RangeError ? "İstek çok büyük." : "Oy bilgisi okunamadı." },
      error instanceof RangeError ? 413 : 400,
    );
  }
  if (payload && typeof payload === "object" && "action" in payload && payload.action === "acknowledge") {
    return voteResponse({ acknowledged: true }, 200, voteNoticeCookie(request));
  }

  const designId = payload && typeof payload === "object" && "designId" in payload ? payload.designId : undefined;
  if (!isDesignId(designId)) {
    return voteResponse({ error: "Geçerli bir tasarım seç." }, 400);
  }

  const identity = await getVoteIdentity(request);
  try {
    const content = await readPublishedContent();
    const product = content.products.find(product => product.id === designId);
    if (!product?.enabled || !product.votingEnabled) {
      return voteResponse({ error: "Bu tasarım yakında gelecek. Şu anda oylamaya kapalı." }, 403, identity.cookie);
    }
    const acknowledged = hasAcknowledgedVoteNotice(request);
    const snapshot = acknowledged ? await saveVote(identity.key, designId) : await readVotes(identity.key);
    if (!acknowledged && !snapshot.selection) {
      return voteResponse({ error: "Oy vermeden önce Anladım butonuna bas." }, 403, identity.cookie);
    }
    if (snapshot.selection !== designId) {
      return voteResponse(
        { error: "Oyunu zaten kullandın. Seçimin değiştirilemez.", ...snapshot, acknowledged },
        409,
        identity.cookie,
      );
    }
    return voteResponse({ ...snapshot, acknowledged }, 200, identity.cookie);
  } catch {
    return unavailableVotes(identity.cookie);
  }
}
