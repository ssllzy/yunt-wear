"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ArrowUp, ArrowDown, Trash2, Star, Plus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import type { ContentProduct } from "@/lib/site-content";
import { uploadMedia, MediaField } from "@/components/admin/media-field";
import { useUploadActivity } from "@/components/admin/upload-activity";

type Photo = ContentProduct["photos"][number];
export function PhotoEditor({ product, onChange }: { product: ContentProduct; onChange: (patch: Partial<ContentProduct>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const activity = useUploadActivity();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState("");
  function update(index: number, patch: Partial<Photo>) { onChange({ photos: product.photos.map((photo, i) => i === index ? { ...photo, ...patch } : photo), ...(product.photos[index].src === product.image && patch.alt ? { imageAlt: patch.alt } : {}) }); }
  function move(index: number, direction: number) {
    const photos = [...product.photos]; [photos[index], photos[index + direction]] = [photos[index + direction], photos[index]];
    onChange({ photos }); setExpanded(null);
  }
  function remove(index: number) {
    const photos = product.photos.filter((_, i) => i !== index);
    const removed = product.photos[index];
    onChange({ photos, ...(removed.src === product.image ? { image: photos[0].src, imageAlt: photos[0].alt } : {}) }); setExpanded(null);
  }
  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); if (!files.length) return;
    if (product.photos.length + files.length > 30) { setError("Bir üründe en fazla 30 fotoğraf olabilir."); event.target.value = ""; return; }
    setBusy(true); activity.change(1); setError(""); const added: Photo[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`${index + 1} / ${files.length} yükleniyor…`);
        const asset = await uploadMedia(file);
        added.push({ src: asset.src, alt: `${product.name} ürün görseli`, label: `Fotoğraf ${product.photos.length + added.length + 1}` });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Fotoğraflar yüklenemedi."); }
    finally { if (added.length) onChange({ photos: [...product.photos, ...added] }); setBusy(false); activity.change(-1); setProgress(""); event.target.value = ""; }
  }
  return <section className="admin-photo-editor" aria-label="Ürün fotoğrafları">
    <div className="admin-section-heading"><h3>Fotoğraflar</h3><span>{product.photos.length} / 30</span></div>
    <p className="admin-help">Yıldız kapak fotoğrafını belirler. Oklarla sıralamayı değiştir.</p>
    <fieldset className="admin-photo-list" disabled={activity.count > 0}>{product.photos.map((photo, index) => <div className="admin-photo-item" key={`${index}-${photo.src}`}>
      <div className="admin-photo-row"><button className="admin-photo-thumb" aria-label={`${photo.label} fotoğrafını düzenle`} onClick={() => setExpanded(expanded === index ? null : index)}><img src={photo.src} alt={photo.alt} loading="lazy" /></button><button className="admin-photo-name" onClick={() => setExpanded(expanded === index ? null : index)}>{photo.label}<small>{product.image === photo.src ? "Kapak fotoğrafı" : `Fotoğraf ${index + 1}`}</small></button>
        <div className="admin-photo-tools"><Button variant="ghost" size="icon-xs" title="Kapak yap" aria-label={`${photo.label} fotoğrafını kapak yap`} aria-pressed={product.image === photo.src} onClick={() => onChange({ image: photo.src, imageAlt: photo.alt })}><Star fill={product.image === photo.src ? "currentColor" : "none"} /></Button><Button variant="ghost" size="icon-xs" aria-label={`${photo.label} fotoğrafını yukarı taşı`} disabled={index === 0 || busy} onClick={() => move(index, -1)}><ArrowUp /></Button><Button variant="ghost" size="icon-xs" aria-label={`${photo.label} fotoğrafını aşağı taşı`} disabled={index === product.photos.length - 1 || busy} onClick={() => move(index, 1)}><ArrowDown /></Button><Button variant="ghost" size="icon-xs" aria-label={`${photo.label} fotoğrafını kaldır`} disabled={product.photos.length === 1 || busy} onClick={() => remove(index)}><Trash2 /></Button></div></div>
      {expanded === index && <div className="admin-photo-fields"><Field><FieldLabel>Fotoğraf adı</FieldLabel><Input value={photo.label} aria-label="Fotoğraf adı" onChange={event => update(index, { label: event.target.value })} maxLength={60} /></Field><Field><FieldLabel>Açıklama</FieldLabel><Input value={photo.alt} aria-label="Fotoğraf açıklaması" onChange={event => update(index, { alt: event.target.value })} maxLength={300} /></Field><MediaField label="Fotoğraf" value={photo.src} onChange={src => { update(index, { src }); if (product.image === photo.src) onChange({ photos: product.photos.map((p, i) => i === index ? { ...p, src } : p), image: src }); }} /></div>}
    </div>)}</fieldset>
    <input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} aria-label="Ürün fotoğrafları yükle" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" onChange={addFiles} disabled={busy} />
    <Button variant="outline" className="admin-full-width" onClick={() => fileRef.current?.click()} disabled={activity.count > 0 || product.photos.length >= 30}>{busy ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{busy ? progress : "Fotoğraf yükle"}</Button>
    <details className="admin-photo-link"><summary>Bağlantıyla fotoğraf ekle</summary><Input value={pendingPhoto} aria-label="Yeni fotoğraf bağlantısı" placeholder="https://…" onChange={event => setPendingPhoto(event.target.value)} /><Button size="sm" variant="outline" disabled={!pendingPhoto || product.photos.length >= 30} onClick={() => { onChange({ photos: [...product.photos, { src: pendingPhoto, alt: `${product.name} ürün görseli`, label: `Fotoğraf ${product.photos.length + 1}` }] }); setPendingPhoto(""); }}>Fotoğraf ekle</Button></details>
    {error && <p role="alert" className="admin-field-error">{error}</p>}
  </section>;
}
