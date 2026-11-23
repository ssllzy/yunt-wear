"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VoteResults } from "@/components/admin/vote-results";
import { TrafficReport } from "@/components/admin/traffic-report";
import { adminErrorMessage } from "@/lib/admin-client";
import type { SiteContent } from "@/lib/site-content";

const registrationSchema = z.object({
  registrations: z.array(z.object({ fullName: z.string(), email: z.string(), consentAt: z.string(), discountPercent: z.number(), designId: z.string() })),
  total: z.number().int().nonnegative(), page: z.number().int().positive(), pages: z.number().int().positive(), pageSize: z.number().int().positive(),
});

export function AudienceReport({ products }: { products: SiteContent["products"] }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<z.infer<typeof registrationSchema> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/registrations?page=${page}`, { cache: "no-store", credentials: "same-origin", signal });
      const body = await response.json();
      const parsed = registrationSchema.safeParse(body);
      if (!response.ok || !parsed.success) throw new Error(adminErrorMessage(body, "Kayıtlar yüklenemedi."));
      if (!signal?.aborted) setData(parsed.data);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Bağlantı kurulamadı.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page]);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  return <main className="admin-reports">
    <header className="admin-reports-heading"><div><p>YUNT STÜDYO</p><h1>Ziyaretler, oylar ve kayıtlar</h1></div><Button variant="outline" asChild><a href="/yonetim"><ArrowLeft data-icon="inline-start" />Site yönetimine dön</a></Button></header>
    <TrafficReport />
    <section className="admin-report-card" aria-labelledby="vote-report-title"><h2 id="vote-report-title">Verilen oylar</h2><VoteResults products={products} embedded /><p className="admin-report-help">Oy vermek için kayıt zorunlu değil. Kayıt olmadan verilen oylar anonimdir.</p></section>
    <section className="admin-report-card" aria-labelledby="registration-report-title">
      <div className="admin-report-section-heading"><div><h2 id="registration-report-title">Haber listesi kayıtları</h2><p><strong>{data ? data.total.toLocaleString("tr-TR") : "—"}</strong> kişi kayıtlı</p></div><Button variant="outline" disabled={loading} onClick={() => void refresh()}><RefreshCw className={loading ? "animate-spin" : undefined} data-icon="inline-start" />{loading ? "Yükleniyor…" : "Yenile"}</Button></div>
      <p className="admin-report-help">İsim ve e-posta yalnız bu korumalı sayfada görünür. Liste, bildirim onayı veren kişileri içerir; otomatik e-posta gönderimi henüz bağlı değil.</p>
      {error && <p role="alert">{error}</p>}
      {loading && !data && <p role="status">Kayıtlar yükleniyor…</p>}
      {data && <><Table><TableHeader><TableRow><TableHead>Ad soyad</TableHead><TableHead>E-posta</TableHead><TableHead>Oy verdiği tasarım</TableHead><TableHead>Kayıt tarihi</TableHead><TableHead>İndirim hakkı</TableHead></TableRow></TableHeader><TableBody>{data.registrations.map(registration => <TableRow key={registration.email}><TableCell>{registration.fullName}</TableCell><TableCell>{registration.email}</TableCell><TableCell>{products.find(product => product.id === registration.designId)?.name ?? registration.designId}</TableCell><TableCell>{new Date(registration.consentAt).toLocaleString("tr-TR")}</TableCell><TableCell>%{registration.discountPercent}</TableCell></TableRow>)}{data.registrations.length === 0 && <TableRow><TableCell colSpan={5}>Henüz haber listesine kayıt olan yok.</TableCell></TableRow>}</TableBody></Table><div className="admin-report-pagination"><p>Sayfa {data.page} / {data.pages} · Toplam {data.total.toLocaleString("tr-TR")} kayıt</p><div><Button variant="outline" size="sm" disabled={loading || data.page <= 1} onClick={() => setPage(data.page - 1)}>Önceki</Button><Button variant="outline" size="sm" disabled={loading || data.page >= data.pages} onClick={() => setPage(data.page + 1)}>Sonraki</Button></div></div></>}
    </section>
  </main>;
}
