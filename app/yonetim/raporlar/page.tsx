import { headers } from "next/headers";
import { hasAdminAccess, adminRequestFromHeaders } from "@/lib/admin-access";
import { readPublishedContent } from "@/lib/content-server";
import { AdminAccessNotice } from "@/components/admin/access-notice";
import { AudienceReport } from "@/components/admin/audience-report";
import "../admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "YUNT — Ziyaretler, oylar ve kayıtlar", alternates: { canonical: null }, robots: { index: false, follow: false } };

export default async function ReportsPage() {
  if (!await hasAdminAccess(adminRequestFromHeaders(new Headers(await headers())))) return <AdminAccessNotice />;
  const content = await readPublishedContent();
  return <AudienceReport products={content.products} />;
}
