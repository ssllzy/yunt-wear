import Link from "next/link";
import { notFound } from "next/navigation";
import { readPublishedContent } from "@/lib/content-server";
import { PRODUCT_ID_PATTERN } from "@/lib/site-content";
import { ProductPageVote } from "@/components/product-page-vote";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!PRODUCT_ID_PATTERN.test(id)) notFound();
  const content = await readPublishedContent();
  const product = content.products.find(item => item.enabled && item.id === id);
  if (!product) notFound();

  return (
    <main className="product-page">
      <Link href="/#koleksiyon">← Koleksiyona dön</Link>
      <header>
        <p>{product.category} · {product.number}</p>
        <h1>{product.name}</h1>
        {product.description && <p>{product.description}</p>}
      </header>
      <ProductPageVote id={product.id} enabled={product.votingEnabled} />
      <dl className="product-page-features">
        {product.features.map(([label, value], index) => (
          <div key={index}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      <div className="product-page-photos" aria-label="Ürün fotoğrafları">
        {[{ src: product.image, alt: product.imageAlt, label: "Kapak" },
          ...product.photos.filter(photo => photo.src !== product.image)].map((photo, index) => (
          <figure key={index}>
            <img src={photo.src} alt={photo.alt} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
            <figcaption>{photo.label}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
