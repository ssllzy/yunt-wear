import { headers } from "next/headers";
import { hasAdminAccess, adminRequestFromHeaders } from "@/lib/admin-access";
import { readContentState } from "@/lib/content-server";
import { PreviewSite } from "@/components/admin/preview-site";

export const dynamic = "force-dynamic";
export const metadata = { title: "YUNT — Taslak önizleme", alternates: { canonical: null }, robots: { index: false, follow: false } };
export default async function PreviewPage() {
  if (!await hasAdminAccess(adminRequestFromHeaders(new Headers(await headers())))) return <p>Önizleme için yönetici girişi gerekli.</p>;
  return <PreviewSite initialContent={(await readContentState()).draft} />;
}
