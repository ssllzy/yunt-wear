import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { siteDocuments } from "@/db/schema";
import { defaultSiteContent, siteContentSchema, type SiteContent } from "@/lib/site-content";

function contentState(row: typeof siteDocuments.$inferSelect) {
  return { draft: siteContentSchema.parse(JSON.parse(row.draft)), published: siteContentSchema.parse(JSON.parse(row.published)), revision: row.revision, updatedAt: row.updatedAt, publishedAt: row.publishedAt };
}

export async function readContentState() {
  const [row] = await getDb().select().from(siteDocuments).where(eq(siteDocuments.id, "main")).limit(1);
  if (!row) return { draft: defaultSiteContent, published: defaultSiteContent, revision: 0, updatedAt: null, publishedAt: null };
  return contentState(row);
}

export async function readPublishedContent(): Promise<SiteContent> {
  const [row] = await getDb().select({ published: siteDocuments.published }).from(siteDocuments).where(eq(siteDocuments.id, "main")).limit(1);
  return row ? siteContentSchema.parse(JSON.parse(row.published)) : defaultSiteContent;
}

export async function writeContent(content: SiteContent, revision: number, publish: boolean) {
  const db = getDb();
  const serialized = JSON.stringify(content);
  const now = new Date().toISOString();
  if (revision === 0) {
    const rows = await db.insert(siteDocuments).values({ id: "main", draft: serialized, published: JSON.stringify(publish ? content : defaultSiteContent), revision: 1, updatedAt: now, publishedAt: publish ? now : null })
      .onConflictDoNothing().returning();
    return rows[0] ? contentState(rows[0]) : null;
  }
  const rows = await db.update(siteDocuments).set({ draft: serialized, revision: sql`${siteDocuments.revision} + 1`, updatedAt: now, ...(publish ? { published: serialized, publishedAt: now } : {}) })
    .where(and(eq(siteDocuments.id, "main"), eq(siteDocuments.revision, revision))).returning();
  return rows[0] ? contentState(rows[0]) : null;
}
