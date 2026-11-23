import { headers } from "next/headers";
import { hasAdminAccess, adminRequestFromHeaders } from "@/lib/admin-access";
import { AdminAccessNotice } from "@/components/admin/access-notice";
import { AdminPanel } from "@/components/admin/admin-panel";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "YUNT — Yönetim", alternates: { canonical: null }, robots: { index: false, follow: false } };
export default async function AdminPage() {
  if (!await hasAdminAccess(adminRequestFromHeaders(new Headers(await headers())))) return <AdminAccessNotice />;
  return <AdminPanel />;
}
