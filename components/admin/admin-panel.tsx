"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, MousePointer2, Shirt, Film, Type, PanelBottom, ArrowUpRight, Save, LoaderCircle, Upload, Undo2, X, Check } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ContentEditor, editorHeading } from "@/components/admin/content-editor";
import { VoteResults } from "@/components/admin/vote-results";
import { SitePreview } from "@/components/admin/site-preview";
import { contentStateSchema, siteContentSchema, contentValidationMessage, type SiteContent, type EditTarget, type ContentState } from "@/lib/site-content";
import { adminErrorMessage } from "@/lib/admin-client";
import { UploadActivityContext } from "@/components/admin/upload-activity";

export function AdminPanel() {
  const [state, setState] = useState<ContentState | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saved, setSaved] = useState("");
  const [selected, setSelected] = useState<EditTarget>("hero.video");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [pending, setPending] = useState<"save" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [activeUploads, setActiveUploads] = useState(0);
  const changeUploads = useCallback((delta: number) => setActiveUploads(count => Math.max(0, count + delta)), []);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const inspectorRef = useRef<HTMLElement | null>(null);
  const inspectorTitleRef = useRef<HTMLHeadingElement | null>(null);
  const busy = useRef(false);
  const exiting=useRef(false);
  const dirty = !!content && JSON.stringify(content) !== saved;
  const unpublished = !!content && !!state && JSON.stringify(content) !== JSON.stringify(state.published);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/content", { cache: "no-store", credentials: "same-origin" });
      const body = await response.json();
      const parsed = contentStateSchema.safeParse(body);
      if (!response.ok || !parsed.success) throw new Error(adminErrorMessage(body, "Panel yüklenemedi."));
      setState(parsed.data); setContent(parsed.data.draft); setSaved(JSON.stringify(parsed.data.draft));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Panel yüklenemedi."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (!exiting.current && (dirty || activeUploads > 0)) { event.preventDefault(); event.returnValue = ""; } }
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, activeUploads]);
  const select = useCallback((target: EditTarget) => { setSelected(target); setInspectorOpen(true); setNotice(""); }, []);
  useEffect(() => {
    if (!inspectorOpen) return;
    inspectorRef.current?.scrollTo({ top: 0 });
    inspectorTitleRef.current?.focus({ preventScroll: true });
  }, [selected, inspectorOpen]);
  function update(change: (current: SiteContent) => SiteContent) { setContent(current => current ? change(current) : current); setNotice(""); }
  async function logout() {
    if ((dirty || activeUploads > 0) && !window.confirm("Kaydedilmemiş değişikliklerin var. Çıkış yapmak istiyor musun?")) return;
    try {const response = await fetch("/api/admin/logout", {method:"POST"}); if(!response.ok) throw new Error(); exiting.current=true; window.location.replace("/yonetim");} catch {setError("Çıkış yapılamadı. Tekrar dene.");}
  }
  async function persist(action: "save" | "publish") {
    if (!content || !state || busy.current || activeUploads > 0) return;
    const parsed = siteContentSchema.safeParse(content);
    if (!parsed.success) { setError(contentValidationMessage(parsed.error)); return; }
    const submitted = parsed.data;
    const submittedRaw = JSON.stringify(content);
    busy.current = true; setPending(action); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, revision: state.revision, content: submitted }) });
      const result = await response.json();
      const parsedResponse = contentStateSchema.safeParse(result);
      if (!response.ok || !parsedResponse.success) throw new Error(adminErrorMessage(result, "Değişiklikler kaydedilemedi."));
      setState(parsedResponse.data); setSaved(JSON.stringify(submitted));
      setContent(current => JSON.stringify(current) === submittedRaw ? submitted : current);
      setNotice(action === "save" ? "Taslağın kaydedildi. Yayındaki site değişmedi." : "Değişikliklerin yayınlandı. Yeni ziyaretçiler güncel siteyi görecek.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bağlantı kurulamadı. Tekrar dene."); }
    finally { busy.current = false; setPending(null); }
  }
  return <UploadActivityContext.Provider value={{ count: activeUploads, change: changeUploads }}><div className="admin-app">
    <aside className="admin-rail"><a className="admin-logo" href="/" aria-label="YUNT ana sayfası"><BrandMark /></a><nav aria-label="Yönetim bölümleri">
      <Button variant="ghost" size="icon" asChild><a href="/yonetim/raporlar" title="Oylar ve kayıtlar" aria-label="Oylar ve kayıtlar sayfasını aç"><BarChart3 /></a></Button>
      <Button variant={selected === "collection.title" ? "secondary" : "ghost"} size="icon" title="Görsel düzenleyici" aria-label="Görsel düzenleyici" onClick={() => select("collection.title")}><MousePointer2 /></Button>
      <Button variant={selected.startsWith("product:") ? "secondary" : "ghost"} size="icon" title="Ürünler" aria-label="Ürünleri düzenle" onClick={() => select(`product:${content?.products[0].id ?? "design-01"}`)}><Shirt /></Button>
      <Button variant={selected === "hero.video" ? "secondary" : "ghost"} size="icon" title="Ana sayfa videosu" aria-label="Ana sayfa videosunu düzenle" onClick={() => select("hero.video")}><Film /></Button>
      <Button variant={selected.startsWith("navbar.") ? "secondary" : "ghost"} size="icon" title="Logo ve menü" aria-label="Logo ve menüyü düzenle" onClick={() => select("navbar.text")}><Type /></Button>
      <Button variant={selected === "footer" ? "secondary" : "ghost"} size="icon" title="Alt bilgi" aria-label="Alt bilgiyi düzenle" onClick={() => select("footer")}><PanelBottom /></Button>
    </nav><Button variant="ghost" size="icon" asChild><a href="/" target="_blank" rel="noreferrer" title="Siteyi aç" aria-label="Siteyi yeni sekmede aç"><ArrowUpRight /></a></Button></aside>
    <div className="admin-workspace"><header className="admin-topbar"><div><p>YUNT STÜDYO</p><h1>Site yönetimi</h1></div><div className="admin-topbar-actions">{state && <VoteResults products={state.published.products} />}<Button variant="ghost" size="sm" onClick={() => void logout()} disabled={!!pending || activeUploads > 0}>Çıkış yap</Button><span className={`admin-status ${dirty ? "is-unsaved" : ""}`}>{!content ? "Yükleniyor" : dirty ? "Kaydedilmedi" : unpublished ? "Taslak" : "Yayında"}</span><Button variant="outline" size="sm" disabled={!content || !!pending || activeUploads > 0 || !dirty} onClick={() => void persist("save")}><Save data-icon="inline-start" />{pending === "save" ? "Kaydediliyor…" : "Taslağı kaydet"}</Button><Button size="sm" disabled={!content || !!pending || activeUploads > 0 || (!unpublished && !dirty)} onClick={() => void persist("publish")}>{pending === "publish" ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}{pending === "publish" ? "Yayınlanıyor…" : "Yayınla"}</Button></div></header>
      {(error || notice) && <div className="admin-message"><Alert variant={error ? "destructive" : "default"}><AlertDescription>{notice && <Check aria-hidden="true" />}{error || notice}{error && !content && <Button variant="link" onClick={() => void load()}>Tekrar dene</Button>}</AlertDescription></Alert><Button variant="ghost" size="icon-sm" aria-label="Bildirimi kapat" onClick={() => { setError(""); setNotice(""); }}><X /></Button></div>}
      {content ? <div className="admin-body"><SitePreview content={content} target={selected} iframeRef={iframeRef} onSelect={select} /><aside ref={inspectorRef} className={`admin-inspector ${inspectorOpen ? "is-open" : ""}`} aria-label="Düzenleme alanı"><div className="admin-inspector-heading"><div><span>SEÇİLİ ALAN</span><h2 ref={inspectorTitleRef} tabIndex={-1}>{editorHeading(selected)}</h2></div><Button variant="ghost" size="icon-sm" className="admin-inspector-close" aria-label="Düzenleme alanını kapat" onClick={() => setInspectorOpen(false)}><X /></Button></div><ContentEditor content={content} selected={selected} onChange={update} onSelect={select} /><div className="admin-inspector-bottom"><Button variant="ghost" size="sm" onClick={() => setRestoreOpen(true)} disabled={activeUploads > 0 || !!pending || (!unpublished && !dirty)}><Undo2 data-icon="inline-start" />Yayındaki sürüme dön</Button><p>Önizlemeye tıklayarak başka bir alan seçebilirsin.</p></div></aside></div> : <div className="admin-loading">{error ? "Bağlantıyı kontrol edip tekrar dene." : <><LoaderCircle className="animate-spin" />Yönetim paneli hazırlanıyor…</>}</div>}
    </div>
    <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Yayındaki içeriği yükle?</AlertDialogTitle><AlertDialogDescription>Bu ekrandaki değişikliklerin yerine şu anda yayında olan içerik gelir. Kayıtlı taslağı da değiştirmek için ardından taslağı kaydet.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction onClick={() => { if (state) { setContent(structuredClone(state.published)); setNotice("Yayındaki içerik düzenleyiciye yüklendi."); setError(""); } }}>Yayındaki içeriği yükle</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></UploadActivityContext.Provider>;
}
