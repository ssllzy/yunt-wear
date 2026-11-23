import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const designIds = [
  "design-01",
  "design-02",
  "design-03",
  "design-04",
  "design-05",
] as const;

export type DesignId = string;

// A voter has one permanent selection. Conflict handling never changes it.
// The key is a SHA-256 digest, never a platform ID, email address, or IP address.
export const designVotes = sqliteTable(
  "design_votes",
  {
    voterKey: text("voter_key").primaryKey(),
    designId: text("design_id").notNull(),
  },
  (table) => [
    index("design_votes_design_idx").on(table.designId),
    check(
      "design_votes_known_design",
      sql`${table.designId} GLOB 'design-[0-9][0-9]' AND ${table.designId} <> 'design-00'`,
    ),
  ],
);

export const newsletterSubscribers = sqliteTable(
  "newsletter_subscribers",
  {
    voterKey: text("voter_key").primaryKey().references(() => designVotes.voterKey),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    discountPercent: integer("discount_percent").notNull().default(20),
    consentAt: text("consent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    consentVersion: text("consent_version").notNull(),
  },
  (table) => [
    uniqueIndex("newsletter_subscribers_email_unique").on(table.email),
    check("newsletter_subscribers_discount", sql`${table.discountPercent} = 20`),
  ],
);

export const siteDocuments = sqliteTable("site_documents", {
  id: text("id").primaryKey(),
  draft: text("draft").notNull(),
  published: text("published").notNull(),
  revision: integer("revision").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at"),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["image", "video"] }).notNull(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: text("created_at").notNull(),
});
