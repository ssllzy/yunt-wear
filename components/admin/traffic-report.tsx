"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trafficSourceLabels, type TrafficReport as Report } from "@/lib/traffic-report";

const date = (value: string) => new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" });
export function TrafficReport() {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/traffic", { credentials: "same-origin", cache: "no-store", signal });
      if (!response.ok) throw new Error("Ziyaretçi raporu yüklenemedi. Oturumunu ve bağlantını kontrol edip tekrar dene.");
      const body: Report = await response.json();
      if (!signal?.aborted) setData(body);
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Bağlantı kurulamadı."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  return <section className="admin-report-card" aria-labelledby="traffic-report-title">
    <div className="admin-report-section-heading"><h2 id="traffic-report-title">Site ziyaretleri</h2><div className="admin-traffic-actions"><Button variant="outline" disabled={loading} onClick={() => void refresh()}><RefreshCw data-icon="inline-start" />{loading ? "Yükleniyor…" : "Yenile"}</Button>{data && <Button variant="outline" asChild><a href="/api/admin/traffic?format=csv" download><Download data-icon="inline-start" />CSV indir</a></Button>}</div></div>
    {error && <p role="alert">{error}</p>}
    {loading && !data && <p role="status">Ziyaretler yükleniyor…</p>}
    {data && <>
      <p className="admin-report-help">Dönem: {date(data.current.start)} – {date(data.current.end)}. Veriler takip kurulumu itibarıyla birikir; önceki ziyaretler bu rapora eklenmez.</p>
      <div className="admin-traffic-totals"><div><span>Görüntülenme</span><strong>{data.current.views.toLocaleString("tr-TR")}</strong></div><div><span>Tahmini tekil ziyaretçi</span><strong>{data.current.visitors.toLocaleString("tr-TR")}</strong></div></div>
      <p className="admin-report-help">Tekil ziyaretçi, aynı tarayıcıdaki 30 günlük anonim çerezle tahmin edilir. Çerez silinmesi ve farklı cihazlar sayıyı artırabilir. IP, isim veya e-posta kaydedilmez. Bilinen botlar, yönetici oturumları ve önizlemeler sayılmaz. 10 saniye içindeki tekrar yüklemeler tek sayılır.</p>
      <h3>Günlük ziyaretler</h3>
      <Table><TableHeader><TableRow><TableHead>Gün (Türkiye saati)</TableHead><TableHead>Görüntülenme</TableHead><TableHead>Tekil ziyaretçi</TableHead></TableRow></TableHeader><TableBody>{data.current.daily.map(day => <TableRow key={day.date}><TableCell>{day.date}</TableCell><TableCell>{day.views}</TableCell><TableCell>{day.visitors}</TableCell></TableRow>)}{!data.current.daily.length && <TableRow><TableCell colSpan={3}>Henüz ziyaret kaydedilmedi.</TableCell></TableRow>}</TableBody></Table>
      <h3>Trafik kaynakları</h3>
      <Table><TableHeader><TableRow><TableHead>Kaynak</TableHead><TableHead>Görüntülenme</TableHead><TableHead>Tekil ziyaretçi</TableHead></TableRow></TableHeader><TableBody>{data.current.sources.map(source => <TableRow key={source.source}><TableCell>{trafficSourceLabels[source.source]}</TableCell><TableCell>{source.views}</TableCell><TableCell>{source.visitors}</TableCell></TableRow>)}{!data.current.sources.length && <TableRow><TableCell colSpan={3}>Henüz kaynak verisi yok.</TableCell></TableRow>}</TableBody></Table>
      <p className="admin-report-help">Kaynak ilk günlük ziyarette belirlenir; uygulamalar kaynak bilgisini gizleyebilir. Günlük ve kaynak bazlı tekillerin toplamı dönem tekiline eşit olmayabilir.</p>
      <h3>30 günlük arşivler</h3>
      <p className="admin-report-help">Her 30 günlük dönem tamamlandığında özet rapor kalıcı arşive kaydedilir, ardından o dönemin anonim ziyaretçi kayıtları silinir. Saatlik otomatik kontrol ve yeni ziyaret/rapor açılışı bu işlemi yürütür. Arşivleme başarısız olursa kayıtlar silinmez. CSV dosyalarını Excel veya metin düzenleyicide açabilirsin.</p>
      <Table><TableHeader><TableRow><TableHead>Dönem</TableHead><TableHead>Görüntülenme</TableHead><TableHead>Tekil</TableHead><TableHead>Dosya</TableHead></TableRow></TableHeader><TableBody>{data.archives.map(archive => <TableRow key={archive.id}><TableCell>{date(archive.start)} – {date(archive.end)}</TableCell><TableCell>{archive.views}</TableCell><TableCell>{archive.visitors}</TableCell><TableCell><Button variant="outline" size="sm" asChild><a href={`/api/admin/traffic?archive=${archive.id}`} download aria-label={`${date(archive.start)} tarihli arşivi indir`}><Download data-icon="inline-start" />CSV indir</a></Button></TableCell></TableRow>)}{!data.archives.length && <TableRow><TableCell colSpan={4}>İlk arşiv, mevcut dönem tamamlandığında oluşacak.</TableCell></TableRow>}</TableBody></Table>
    </>}
  </section>;
}
