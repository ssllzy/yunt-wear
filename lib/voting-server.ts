import {requestOrigin} from "@/lib/request-origin";
import { PRODUCT_ID_PATTERN } from "@/lib/site-content";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { designIds, designVotes, type DesignId } from "@/db/schema";
import { env } from "cloudflare:workers";

const HOSTED_HOSTNAME = "legacy-preview.example.invalid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VoteIdentity = { key: string; cookie?: string };

function voteNoticeCookieName(request: Request) {
  return requestOrigin(request)?.startsWith("https:") ? "__Host-yunt_vote_notice" : "yunt_vote_notice";
}

export function hasAcknowledgedVoteNotice(request: Request): boolean {
  return request.headers.get("cookie")?.split(";").some(part => part.trim() === voteNoticeCookieName(request) + "=1") ?? false;
}

export function voteNoticeCookie(request: Request): string {
  const name = voteNoticeCookieName(request);
  return name + "=1; Path=/; Max-Age=" + COOKIE_MAX_AGE + "; HttpOnly; SameSite=Lax" +
    (name.startsWith("__Host-") ? "; Secure" : "");
}

export type VoteSnapshot = {
  counts: Record<DesignId, number>;
  selection: DesignId | null;
  total: number;
};

export function isDesignId(value: unknown): value is DesignId {
  return typeof value === "string" && PRODUCT_ID_PATTERN.test(value);
}

export function isSameOriginMutation(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).origin === requestOrigin(request);
  } catch {
    return false;
  }
}

async function digestIdentity(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getVoteIdentity(request: Request): Promise<VoteIdentity> {
  const url = new URL(request.url);
  const secure = requestOrigin(request)?.startsWith("https:") ?? url.protocol === "https:";

  // Sites dispatch owns these headers on this hosted origin. Do not trust an
  // arbitrary header supplied to a local preview or a different deployment.
  const platformUser = request.headers.get("oai-authenticated-user-id");
  if (
    secure &&
    url.hostname === HOSTED_HOSTNAME &&
    platformUser &&
    request.headers.has("oai-authenticated-user-email")
  ) {
    return { key: await digestIdentity(`platform:${platformUser}`) };
  }

  const cookieName = secure ? "__Host-yunt_voter" : "yunt_voter";
  const existing = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  const validCookie = existing && UUID_PATTERN.test(existing) ? existing : undefined;
  const voter = validCookie ?? crypto.randomUUID();
  return {
    key: await digestIdentity(`anonymous:${voter}`),
    ...(!validCookie && {
      cookie: `${cookieName}=${voter}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
    }),
  };
}

function createSnapshot(
  rows: { designId: DesignId; votes: number }[],
  selectedRows: { designId: DesignId }[],
): VoteSnapshot {
  const counts = Object.fromEntries(designIds.map((id) => [id, 0])) as Record<DesignId, number>;
  for (const row of rows) counts[row.designId] = Number(row.votes);
  return {
    counts,
    selection: selectedRows[0]?.designId ?? null,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
  };
}

export async function readVoteTotals() {
  if (process.env.YUNT_D1_VOTE_TOTALS === "1") {
    if (!env.DB) throw new Error("D1 is unavailable");
    const { results } = await env.DB.prepare("SELECT design_id AS designId, votes FROM design_vote_totals").all<{ designId: DesignId; votes: number }>();
    return results;
  }
  return getDb().select({ designId: designVotes.designId, votes: count() }).from(designVotes).groupBy(designVotes.designId);
}

export async function readVotes(voterKey: string): Promise<VoteSnapshot> {
  const db = getDb();
  const [counts, selection] = await Promise.all([
    readVoteTotals(),
    db.select({ designId: designVotes.designId }).from(designVotes).where(eq(designVotes.voterKey, voterKey)).limit(1),
  ]);
  return createSnapshot(counts, selection);
}

export async function saveVote(voterKey: string, designId: DesignId): Promise<VoteSnapshot> {
  const db = getDb();
  // The unique primary key gives concurrent first votes one winner on both
  // databases. The winning immutable selection is read after the insert.
  await db.insert(designVotes).values({voterKey,designId}).onConflictDoNothing({target:designVotes.voterKey});
  return readVotes(voterKey);
}

export async function readSmallJson(request: Request, maxBytes = 1024): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RangeError("Payload too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function voteResponse(data: unknown, status = 200, cookie?: string): Response {
  const headers: HeadersInit = {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    Vary: "Cookie, Origin, oai-authenticated-user-id",
    "X-Content-Type-Options": "nosniff",
  };
  if (cookie) headers["Set-Cookie"] = cookie;
  return Response.json(data, { status, headers });
}

export function unavailableVotes(cookie?: string): Response {
  // Never leak SQL, bindings, credentials, or identity data to the browser.
  return voteResponse(
    { error: "Oylama şu anda kullanılamıyor. Lütfen biraz sonra tekrar dene." },
    503,
    cookie,
  );
}
