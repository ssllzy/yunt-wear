import { z } from "zod";
import { designs } from "@/lib/collection";

const text = (max: number) => z.string().trim().min(1, "Bu alan boş olamaz.").max(max);
export const assetUrlSchema = z.string().max(2048).refine(value => {
  if (/^\/(?:media|api\/media)\/[a-zA-Z0-9/_%. -]+$/.test(value) && !value.includes("..")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Bir görsel/video yükle veya geçerli bir HTTPS bağlantısı yaz.");
const optionalAsset = z.union([z.literal(""), assetUrlSchema]);
const photoSchema = z.object({ src: assetUrlSchema, alt: text(300), label: text(60) }).strict();
export const MAX_PRODUCTS = 30;
export const PRODUCT_ID_PATTERN = /^design-(?:0[1-9]|[1-9][0-9])$/;

export const productSchema = z.object({
  id: z.string().regex(PRODUCT_ID_PATTERN),
  number: z.string().regex(/^(?:0[1-9]|[1-9][0-9])$/), name: text(70), category: text(70),
  description: z.string().trim().max(500), color: text(40), enabled: z.boolean(), votingEnabled: z.boolean().default(true),
  image: assetUrlSchema, imageAlt: text(300), photos: z.array(photoSchema).min(1).max(30),
  features: z.array(z.tuple([text(40), text(100)])).min(1).max(8),
}).strict().refine(item => item.id === `design-${item.number}`, "Ürün numarası kimlikle eşleşmeli.");

export const siteContentSchema = z.object({
  navbar: z.object({ text: text(32), logo: optionalAsset, logoAlt: text(100), linkText: text(32) }).strict(),
  hero: z.object({ video: assetUrlSchema, poster: optionalAsset }).strict(),
  collection: z.object({ title: text(24) }).strict(),
  footer: z.object({ text: text(60), tagline: z.string().trim().max(100) }).strict(),
  products: z.array(productSchema).min(1).max(MAX_PRODUCTS).refine(items => new Set(items.map(item => item.id)).size === items.length, "Ürün alanları tekrarlanamaz.")
    .refine(items => items.some(item => item.enabled), "En az bir ürün görünür olmalı."),
}).strict();

export type SiteContent = z.infer<typeof siteContentSchema>;
export type ContentProduct = SiteContent["products"][number];
export const contentStateSchema = z.object({ draft: siteContentSchema, published: siteContentSchema, revision: z.number().int().min(0), updatedAt: z.string().nullable(), publishedAt: z.string().nullable() });
export type ContentState = z.infer<typeof contentStateSchema>;
export type EditTarget = "navbar.text" | "navbar.logo" | "navbar.linkText" | "hero.video" | "collection.title" | "footer" | `product:${string}`;
export const defaultSiteContent: SiteContent = siteContentSchema.parse({
  navbar: { text: "YUNT", logo: "", logoAlt: "YUNT at başı logosu", linkText: "KOLEKSİYON" },
  hero: { video: "/media/steppe.mp4", poster: "/media/steppe-poster.jpg" },
  collection: { title: "YUNT" }, footer: { text: "YUNT WEAR", tagline: "KENDİ İZİNİ BIRAK." },
  products: designs.map(design => ({ ...design, description: "Sade bir form. Kendine ait bir iz.", color: "Siyah", enabled: true })),
});

export function contentValidationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = issue?.path[0] === "products" ? "Ürün bilgileri" : "Site ayarları";
  return `${field}: ${issue?.message ?? "Bilgileri kontrol et."}`;
}
