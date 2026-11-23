"use client";

import { useId } from "react";
import {useUploadActivity} from "@/components/admin/upload-activity";
import { Plus, X, ArrowLeft, ArrowRight, Undo2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { MediaField } from "@/components/admin/media-field";
import { PhotoEditor } from "@/components/admin/photo-editor";
import { defaultSiteContent, MAX_PRODUCTS, type EditTarget, type SiteContent, type ContentProduct } from "@/lib/site-content";

function TextField({ label, value, onChange, max = 100, multiline = false }: { label: string; value: string; onChange: (value: string) => void; max?: number; multiline?: boolean }) {
  const id = useId();
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel>{multiline ? <Textarea id={id} value={value} onChange={event => onChange(event.target.value)} maxLength={max} rows={3} /> : <Input id={id} value={value} onChange={event => onChange(event.target.value)} maxLength={max} />}</Field>;
}

export function editorHeading(target: EditTarget): string {
  if (target.startsWith("product:")) return "Ürün düzenle";
  if (target.startsWith("navbar.")) return "Logo ve menü";
  if (target === "hero.video") return "Ana sayfa videosu";
  if (target === "collection.title") return "Koleksiyon yazısı";
  return "Alt bilgi";
}

export function ContentEditor({ content, selected, onChange, onSelect }: {
  content: SiteContent; selected: EditTarget; onChange: (update: (current: SiteContent) => SiteContent) => void; onSelect: (target: EditTarget) => void;
}) {
  const uploads=useUploadActivity();
  const productId = selected.startsWith("product:") ? selected.slice(8) : null;
  const product = content.products.find(item => item.id === productId);
  const nextNumber = Math.max(...content.products.map(item => Number(item.number))) + 1;
  const canAdd = content.products.length < MAX_PRODUCTS && nextNumber <= 99;

  function addProduct() {
    if (!canAdd) return;
    const number = String(nextNumber).padStart(2, "0");
    const id = "design-" + number;
    const image = "/media/product-card.webp";
    const name = "Yeni ürün " + number;
    const item: ContentProduct = {
      id, number, name, category: "KOLEKSİYON 01", description: "", color: "Siyah",
      enabled: false, votingEnabled: false, image, imageAlt: name,
      photos: [{ src: image, alt: name, label: "Ön" }], features: [["Renk", "Siyah"]],
    };
    onChange(current => ({ ...current, products: [...current.products, item] }));
    onSelect(`product:${id}`);
  }

  function patchProduct(id: string, patch: Partial<ContentProduct>) { onChange(current => ({ ...current, products: current.products.map(item => item.id === id ? { ...item, ...patch } : item) })); }
  function moveProduct(id: string, direction: number) {
    onChange(current => { const products = [...current.products]; const index = products.findIndex(item => item.id === id); [products[index], products[index + direction]] = [products[index + direction], products[index]]; return { ...current, products }; });
  }
  return <div className="admin-editor-fields">
    {product ? <>
      <div className="admin-product-tabs" aria-label="Düzenlenecek ürün">{content.products.map(item => <button key={item.id} className={item.id === product.id ? "is-current" : ""} onClick={() => onSelect(`product:${item.id}`)} title={item.name} aria-label={`${item.name} ürününü düzenle`} aria-pressed={item.id === product.id}>{item.number}</button>)}</div>
      <Button variant="outline" size="sm" onClick={addProduct} disabled={!canAdd}><Plus data-icon="inline-start" />Yeni ürün ekle</Button>
      <p className="admin-help">Yeni ürün gizli ve oylamaya kapalı başlar. Kapak ve galeriyi düzenle, görünürlüğü aç ve yayınla.</p>
      {product.enabled && <a href={`/urun/${product.id}`} target="_blank" rel="noreferrer">Yayınlanan ürün sayfasını aç</a>}
      <p className="admin-help">Ürün bilgilerini düzenlemek mevcut oyları sıfırlamaz.</p>
      <FieldGroup><TextField label="Ürün adı" value={product.name} onChange={name => patchProduct(product.id, { name })} max={70} />
        <TextField label="Koleksiyon / kategori" value={product.category} onChange={category => patchProduct(product.id, { category })} max={70} />
        <TextField label="Ürün açıklaması" value={product.description} onChange={description => patchProduct(product.id, { description })} max={500} multiline />
        <TextField label="Renk etiketi" value={product.color} onChange={color => patchProduct(product.id, { color })} max={40} />
        <Field orientation="horizontal"><FieldLabel htmlFor={`visible-${product.id}`}>Sitede göster</FieldLabel><Switch id={`visible-${product.id}`} checked={product.enabled} onCheckedChange={enabled => patchProduct(product.id, { enabled })} /></Field>
        <Field orientation="horizontal"><FieldLabel htmlFor={`voting-${product.id}`}>Oy vermeye açık</FieldLabel><Switch id={`voting-${product.id}`} checked={product.votingEnabled} onCheckedChange={votingEnabled => patchProduct(product.id, { votingEnabled })} /></Field>
        <p className="admin-help">Kapalıysa kartta ve ürün incelemesinde “Yakında gelecek” görünür. Eski oylar korunur. Değişikliği siteye yansıtmak için Yayınla.</p>
      </FieldGroup>
      <div className="admin-inline-actions"><span>Sitedeki sırası</span><Button variant="outline" size="icon-sm" aria-label="Ürünü sola taşı" disabled={content.products[0].id === product.id} onClick={() => moveProduct(product.id, -1)}><ArrowLeft /></Button><Button variant="outline" size="icon-sm" aria-label="Ürünü sağa taşı" disabled={content.products.at(-1)?.id === product.id} onClick={() => moveProduct(product.id, 1)}><ArrowRight /></Button></div>
      <div className="admin-editor-section"><MediaField label="Kapak fotoğrafı" value={product.image} onChange={image => patchProduct(product.id, { image })} /><TextField label="Kapak fotoğrafı açıklaması" value={product.imageAlt} onChange={imageAlt => patchProduct(product.id, { imageAlt })} max={300} /></div>
      <section className="admin-editor-section"><div className="admin-section-heading"><h3>Özellikler</h3><span>{product.features.length} / 8</span></div>{product.features.map(([label, value], index) => <div className="admin-feature-row" key={index}><Input value={label} aria-label={`${index + 1}. özellik başlığı`} placeholder="Özellik" maxLength={40} onChange={event => patchProduct(product.id, { features: product.features.map((feature, i) => i === index ? [event.target.value, value] : feature) })} /><Input value={value} aria-label={`${index + 1}. özellik değeri`} placeholder="Değer" maxLength={100} onChange={event => patchProduct(product.id, { features: product.features.map((feature, i) => i === index ? [label, event.target.value] : feature) })} /><Button variant="ghost" size="icon-xs" aria-label={`${label || index + 1} özelliğini kaldır`} disabled={product.features.length === 1} onClick={() => patchProduct(product.id, { features: product.features.filter((_, i) => i !== index) })}><X /></Button></div>)}<Button variant="ghost" size="sm" disabled={product.features.length >= 8} onClick={() => patchProduct(product.id, { features: [...product.features, ["Özellik", "Değer"]] })}><Plus data-icon="inline-start" />Özellik ekle</Button></section>
      <PhotoEditor key={product.id} product={product} onChange={patch => patchProduct(product.id, patch)} />
    </> : selected.startsWith("navbar.") ? <FieldGroup>
      <TextField label="Navbar yazısı" value={content.navbar.text} onChange={text => onChange(current => ({ ...current, navbar: { ...current.navbar, text } }))} max={32} />
      <MediaField label="Navbar logosu" value={content.navbar.logo} optional onChange={logo => onChange(current => ({ ...current, navbar: { ...current.navbar, logo } }))} />
      <p className="admin-help">Logo yüklenmezse mevcut at başı kullanılır. Şeffaf PNG veya WebP seçebilirsin.</p>
      <TextField label="Logo açıklaması" value={content.navbar.logoAlt} onChange={logoAlt => onChange(current => ({ ...current, navbar: { ...current.navbar, logoAlt } }))} max={100} />
      <TextField label="Menü bağlantısının yazısı" value={content.navbar.linkText} onChange={linkText => onChange(current => ({ ...current, navbar: { ...current.navbar, linkText } }))} max={32} />
    </FieldGroup> : selected === "hero.video" ? <FieldGroup>
      <MediaField label="Ana sayfa videosu" kind="video" value={content.hero.video} onChange={video => onChange(current => ({ ...current, hero: { ...current.hero, video } }))} />
      <Button variant="outline" size="sm" disabled={uploads.count > 0 || content.hero.video === defaultSiteContent.hero.video} onClick={() => onChange(current => ({ ...current, hero: { ...current.hero, video: defaultSiteContent.hero.video } }))}><Undo2 data-icon="inline-start" />Videoyu varsayılana döndür</Button>
      <MediaField label="Video kapak görseli" value={content.hero.poster} optional onChange={poster => onChange(current => ({ ...current, hero: { ...current.hero, poster } }))} />
      <Button variant="outline" size="sm" disabled={uploads.count > 0 || content.hero.poster === defaultSiteContent.hero.poster} onClick={() => onChange(current => ({ ...current, hero: { ...current.hero, poster: defaultSiteContent.hero.poster } }))}><Undo2 data-icon="inline-start" />Kapağı varsayılana döndür</Button>
      <p className="admin-help">Seçtiğin video açılışta ve koleksiyon yazısının içinde oynar. Kapak görseli video yüklenirken görünür.</p>
      <p className="admin-help">Varsayılana dönmek yalnız seçtiğin alanı değiştirir. Önizlemede kontrol edip kaydet veya yayınla.</p>
    </FieldGroup> : selected === "collection.title" ? <FieldGroup>
      <TextField label="Ürünlerin üzerindeki yazı" value={content.collection.title} onChange={title => onChange(current => ({ ...current, collection: { title } }))} max={24} />
      <p className="admin-help">En fazla 24 karakter. Video dolgu ve yazı animasyonu korunur.</p>
    </FieldGroup> : <FieldGroup>
      <TextField label="Alt bilgi marka yazısı" value={content.footer.text} onChange={text => onChange(current => ({ ...current, footer: { ...current.footer, text } }))} max={60} />
      <TextField label="Alt bilgi sloganı" value={content.footer.tagline} onChange={tagline => onChange(current => ({ ...current, footer: { ...current.footer, tagline } }))} max={100} />
    </FieldGroup>}
  </div>;
}
