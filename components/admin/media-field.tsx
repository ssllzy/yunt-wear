"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { Upload, ImagePlus, Film, LoaderCircle, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { z } from "zod";
import { assetUrlSchema } from "@/lib/site-content";
import { adminErrorMessage } from "@/lib/admin-client";
import { useUploadActivity } from "@/components/admin/upload-activity";

const mediaAssetSchema = z.object({ id: z.string(), src: assetUrlSchema, kind: z.enum(["image", "video"]), name: z.string(), size: z.number(), contentType: z.string() });
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export async function uploadMedia(file: File): Promise<MediaAsset> {
  const kind = file.type.startsWith("video/") ? "video" : "image";
  if (file.size > (kind === "video" ? 40 : 10) * 1024 * 1024) throw new Error(`Dosya en fazla ${kind === "video" ? "40" : "10"} MB olabilir.`);
  async function send(body: unknown) {
    const response=await fetch("/api/admin/uploads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const result=await response.json(); if(!response.ok) throw new Error(adminErrorMessage(result,"Dosya yüklenemedi.")); return result;
  }
  const start=z.object({ticket:z.string(),chunkSize:z.number().int().positive()}).parse(await send({action:"start",name:file.name,type:file.type,size:file.size}));
  for(let offset=0,part=0;offset<file.size;offset+=start.chunkSize,part++) {
    const response=await fetch(`/api/admin/uploads?part=${part}`,{method:"PUT",headers:{"Content-Type":"application/octet-stream","X-Upload-Ticket":start.ticket},body:file.slice(offset,offset+start.chunkSize)});
    if(!response.ok) throw new Error(adminErrorMessage(await response.json(),"Dosya parçası yüklenemedi."));
  }
  const parsed=z.object({asset:mediaAssetSchema}).safeParse(await send({action:"complete",ticket:start.ticket}));
  if(!parsed.success) throw new Error("Dosya yükleme yanıtı okunamadı.");
  return parsed.data.asset;
}

export function MediaField({ label, value, onChange, kind = "image", optional = false }: {
  label: string; value: string; onChange: (value: string) => void; kind?: "image" | "video"; optional?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const activity = useUploadActivity();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [libraryError, setLibraryError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true); activity.change(1); setError("");
    try { const asset = await uploadMedia(file); onChange(asset.src); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Dosya yüklenemedi."); }
    finally { setUploading(false); activity.change(-1); event.target.value = ""; }
  }
  async function openLibrary() {
    setLibraryOpen(true); setAssets(null); setLibraryError("");
    try {
      const response = await fetch("/api/admin/media", { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      const parsed = z.object({ assets: z.array(mediaAssetSchema) }).safeParse(result);
      if (!response.ok || !parsed.success) throw new Error();
      setAssets(parsed.data.assets.filter(asset => asset.kind === kind));
    } catch { setLibraryError("Medya kütüphanesi yüklenemedi. Tekrar açmayı deneyebilirsin."); }
  }
  return <Field className="admin-media-field">
    <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
    {value && <div className={`admin-media-preview ${kind === "video" ? "is-video" : ""}`}>{kind === "image" ? <img src={value} alt={`${label} önizlemesi`} loading="lazy" /> : <video src={value} controls muted playsInline preload="metadata" />}</div>}
    <div className="admin-media-actions"><Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={activity.count > 0}>{uploading ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}{uploading ? "Yükleniyor…" : "Dosya yükle"}</Button><Button type="button" variant="ghost" size="sm" disabled={activity.count > 0} onClick={() => void openLibrary()}><Library data-icon="inline-start" />Kütüphane</Button></div>
    <input ref={fileRef} type="file" aria-label={`${label} dosyası yükle`} className="sr-only" tabIndex={-1} accept={kind === "image" ? "image/png,image/jpeg,image/webp,image/avif,image/gif" : "video/mp4,video/webm"} onChange={upload} disabled={uploading} />
    <Input id={inputId} value={value} disabled={activity.count > 0} onChange={event => onChange(event.target.value)} placeholder={optional ? "İsteğe bağlı görsel bağlantısı" : "Veya bir HTTPS bağlantısı yapıştır"} aria-label={`${label} bağlantısı`} />
    <p className="admin-help">{kind === "image" ? "PNG, JPG, WebP, AVIF, GIF · En fazla 10 MB" : "MP4 veya WebM · En fazla 40 MB"}</p>
    {optional && value && <Button type="button" size="sm" variant="ghost" disabled={activity.count > 0} onClick={() => onChange("")}>Görseli kaldır</Button>}
    {error && <p role="alert" className="admin-field-error">{error}</p>}
    <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}><DialogContent className="admin-library-dialog"><DialogTitle>Medya kütüphanesi</DialogTitle><DialogDescription>Önceden yüklediğin {kind === "image" ? "bir görseli" : "bir videoyu"} seç.</DialogDescription>
      {libraryError ? <p role="alert">{libraryError}</p> : assets === null ? <p>Yükleniyor…</p> : assets.length === 0 ? <div className="admin-library-empty">{kind === "image" ? <ImagePlus /> : <Film />}<p>Henüz dosya yüklemedin.</p></div> : <div className="admin-library-grid">{assets.map(asset => <button key={asset.id} onClick={() => { onChange(asset.src); setLibraryOpen(false); }} aria-label={`${asset.name} dosyasını seç`}>{asset.kind === "image" ? <img src={asset.src} alt="" loading="lazy" /> : <Film />}<span>{asset.name}</span></button>)}</div>}
    </DialogContent></Dialog>
  </Field>;
}
