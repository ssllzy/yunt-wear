"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { adminErrorMessage } from "@/lib/admin-client";
import type { SiteContent } from "@/lib/site-content";

const resultsSchema = z.object({ counts: z.record(z.number().int().nonnegative()), total: z.number().int().nonnegative(), updatedAt: z.string().datetime() });

export function VoteResults({ products, embedded = false }: { products: SiteContent["products"]; embedded?: boolean }) {
  const [open, setOpen] = useState(embedded);
  const [results, setResults] = useState<z.infer<typeof resultsSchema> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/votes", { cache: "no-store", credentials: "same-origin", signal });
      const body = await response.json();
      const parsed = resultsSchema.safeParse(body);
      if (!response.ok || !parsed.success) throw new Error(adminErrorMessage(body, "Oy sonuçları yüklenemedi."));
      if (!signal?.aborted) setResults(parsed.data);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Bağlantı kurulamadı.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [open, refresh]);

  const max = Math.max(1, ...Object.values(results?.counts ?? {}));
  const number = new Intl.NumberFormat("tr-TR");
  const chart = <>
      <div className="admin-vote-summary"><div><span>TOPLAM OY</span><strong>{results ? number.format(results.total) : "—"}</strong></div><Button variant="outline" size="sm" disabled={loading} onClick={() => void refresh()}><RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : undefined} />{loading ? "Yükleniyor…" : "Yenile"}</Button></div>
      {error && <p role="alert">{error}</p>}
      {!results && loading && <p role="status">Oylar yükleniyor…</p>}
      {results && <><ol className="admin-vote-bars" aria-label="Tasarımlara göre oy sayıları">{products.map(product => {
        const votes = results.counts[product.id] ?? 0;
        const percentage = results.total ? votes / results.total * 100 : 0;
        return <li key={product.id}><div className="admin-vote-label"><span>{product.number} · {product.name}{!product.enabled && " (gizli)"}</span><strong>{number.format(votes)} oy <small>· %{number.format(Math.round(percentage * 10) / 10)}</small></strong></div><div className="admin-vote-track" aria-hidden="true"><div style={{ width: `${votes / max * 100}%` }} /></div></li>;
      })}</ol>{results.total === 0 && <p>Henüz oy verilmedi. İlk oy geldiğinde burada görünecek.</p>}<p className="admin-vote-updated">Son güncelleme: {new Date(results.updatedAt).toLocaleString("tr-TR")}</p></>}
  </>;
  if (embedded) return chart;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="sm"><BarChart3 data-icon="inline-start" />Oy sonuçları</Button></DialogTrigger>
    <DialogContent className="admin-vote-results">
      <DialogHeader><DialogTitle>Oy dağılımı</DialogTitle><DialogDescription>Yayındaki tasarımların toplam oyları. Bu grafik yalnız yönetim panelinde görünür.</DialogDescription></DialogHeader>
      {chart}
    </DialogContent>
  </Dialog>;
}
