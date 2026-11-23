import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { designVotes, newsletterSubscribers } from "@/db/schema";
import { adminGuard } from "@/lib/admin-access";
import { voteResponse } from "@/lib/voting-server";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  const rawPage = new URL(request.url).searchParams.get("page") ?? "1";
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) return voteResponse({ error: "Geçersiz sayfa numarası." }, 400);
  try {
    const db = getDb();
    const [summary] = await db.select({ total: count() }).from(newsletterSubscribers);
    const total = Number(summary.total);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Number(rawPage), pages);
    const registrations = await db.select({
      fullName: newsletterSubscribers.fullName,
      email: newsletterSubscribers.email,
      consentAt: newsletterSubscribers.consentAt,
      discountPercent: newsletterSubscribers.discountPercent,
      designId: designVotes.designId,
    }).from(newsletterSubscribers)
      .innerJoin(designVotes, eq(newsletterSubscribers.voterKey, designVotes.voterKey))
      .orderBy(desc(newsletterSubscribers.consentAt), newsletterSubscribers.email)
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
    // Both SQLite UTC text and Postgres timestamps become portable ISO dates.
    const normalized = registrations.map(registration => {
      const timestamp = registration.consentAt.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
      const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp) ? timestamp : `${timestamp}Z`;
      return { ...registration, consentAt: new Date(zoned).toISOString() };
    });
    return voteResponse({ registrations: normalized, total, page, pages, pageSize: PAGE_SIZE });
  } catch {
    return voteResponse({ error: "Kayıtlar yüklenemedi. Tekrar dene." }, 503);
  }
}
