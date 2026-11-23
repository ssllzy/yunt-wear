import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { designVotes, newsletterSubscribers } from "@/db/schema";

export const NEWSLETTER_CONSENT_VERSION = "launch-newsletter-20pct-v1";
export const NEWSLETTER_DISCOUNT_PERCENT = 20;

const emailSchema = z.string().max(254).email();

export type NewsletterInput = {
  email: string;
  fullName: string;
  consent: true;
};

export function parseNewsletterInput(payload: unknown): NewsletterInput | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const fields = payload as Record<string, unknown>;
  if (
    typeof fields.email !== "string" ||
    typeof fields.fullName !== "string" ||
    fields.consent !== true ||
    /[\u0000-\u001f\u007f]/.test(fields.fullName)
  ) return null;

  // Provider-independent validation: aliases and non-Gmail domains are allowed.
  const email = fields.email.trim().toLowerCase();
  const fullName = fields.fullName.trim().replace(/\s+/g, " ").normalize("NFC");
  if (!emailSchema.safeParse(email).success || fullName.length < 2 || fullName.length > 120) return null;
  return { email, fullName, consent: true };
}

export async function subscribeAfterVote(voterKey: string, input: NewsletterInput): Promise<boolean> {
  const db = getDb();
  const [vote] = await db
    .select({ voterKey: designVotes.voterKey })
    .from(designVotes)
    .where(eq(designVotes.voterKey, voterKey))
    .limit(1);
  if (!vote) return false;

  // Both voter key and normalized email are unique. Concurrent repeats are
  // harmless, and neither identity nor email conflicts overwrite personal data.
  // The foreign key also prevents a subscription without a persisted vote.
  await db.insert(newsletterSubscribers).values({
    voterKey,
    email: input.email,
    fullName: input.fullName,
    discountPercent: NEWSLETTER_DISCOUNT_PERCENT,
    consentVersion: NEWSLETTER_CONSENT_VERSION,
  }).onConflictDoNothing();
  return true;
}
