"use client";

import { lazy, Suspense, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft, ArrowRight } from "lucide-react";
import { cardImageSources } from "@/lib/optimized-media";
import { DrawLineText } from "@/components/ui/draw-line-text";
import { VoteNotice } from "@/components/vote-notice";
import { VoteButton } from "@/components/vote-button";
import { Button } from "@/components/ui/button";
import { type Design } from "@/lib/collection";
import type { SiteContent } from "@/lib/site-content";
import { useVotes } from "@/hooks/use-votes";
const NewsletterDialog = lazy(() => import("@/components/newsletter-dialog").then(module => ({ default: module.NewsletterDialog })));

const ProductViewer = lazy(() => import("@/components/product-viewer"));

export function Collection({ content, preview = false }: { content: SiteContent; preview?: boolean }) {
  const voting = useVotes(preview);
  const [selected, setSelected] = useState<Design | null>(null);
  const [sourceRect, setSourceRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const newsletterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const newsletter = { open: newsletterOpen, onOpenChange: setNewsletterOpen, subscribed, onSubscribed: () => setSubscribed(true) };
  const onVoted = () => setNewsletterOpen(true);

  function open(design: Design, trigger: HTMLButtonElement) {
    const rect = trigger.getBoundingClientRect();
    triggerRef.current = trigger;
    setSourceRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setSelected(design);
  }

  return (
    <section id="koleksiyon" className="collection" aria-labelledby="collection-title">
      <div className="collection-wordmark" data-edit-target="collection.title"><h2 id="collection-title" className="sr-only">{content.collection.title} koleksiyonu</h2>
        <DrawLineText text={content.collection.title} videoSrc={content.hero.video} poster={content.hero.poster} fontSize={260} letterSpacing={-14} strokeWidth={2} />
      </div>
      <div className="collection-products">
      <div className={content.products.filter(design => design.enabled).length > 5 ? "product-rail product-rail-expanded" : "product-rail"} ref={railRef} style={{ "--product-count": content.products.filter(design => design.enabled).length } as CSSProperties}>
        {content.products.filter(design => design.enabled).map(design => <article className="product-card" key={design.id} data-edit-target={`product:${design.id}`}>
          <button className="product-image-button" onClick={event => open(design, event.currentTarget)} aria-label={`${design.name} tasarımını incele`}>
            <span className="product-number">{design.number}</span>
            <img src={design.image} {...cardImageSources(design.image)} width="560" height="700" alt={design.imageAlt} loading="lazy" decoding="async" />
            <span className="image-open-indicator" aria-hidden="true"><ArrowUpRight /></span>
          </button>
          <div className="product-caption"><h3>{preview ? design.name : <Link href={`/urun/${design.id}`}>{design.name}</Link>}</h3><span>{design.color.toLocaleUpperCase("tr")}</span></div>
          <div className="product-vote-row"><VoteButton id={design.id} enabled={design.votingEnabled} voting={voting} onVoted={onVoted} /></div>
        </article>)}
      </div>
        <VoteNotice voting={voting} overlay preview={preview} onAcknowledged={() => railRef.current?.querySelector<HTMLButtonElement>(".product-image-button")?.focus({ preventScroll: true })} />
      </div>
      <div className="collection-bottom">
        <div className="collection-feedback"><p aria-live="polite">{voting.votes?.selection ? "Oyun kaydedildi. Seçimin değiştirilemez." : "Tek oy hakkın var. Seçimin değiştirilemez."}</p>
          {voting.votes?.selection && <Button ref={newsletterTriggerRef} variant="link" onClick={() => setNewsletterOpen(true)}>{subscribed ? "Kaydını görüntüle" : "%20 indirim için kaydol"}<ArrowUpRight data-icon="inline-end" /></Button>}
        </div>
        <div className="rail-controls"><Button variant="outline" size="icon" aria-label="Önceki tasarımlar" onClick={() => railRef.current?.scrollBy({ left: -320, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}><ArrowLeft /></Button><Button variant="outline" size="icon" aria-label="Sonraki tasarımlar" onClick={() => railRef.current?.scrollBy({ left: 320, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}><ArrowRight /></Button></div>
      </div>
      {voting.error && <div className="vote-error" role="alert"><p>{voting.error}</p><Button variant="link" onClick={() => void voting.refresh()}>Tekrar dene</Button></div>}
      {selected ? <Suspense fallback={null}><ProductViewer design={selected} origin={sourceRect} voting={voting} onClose={() => setSelected(null)} triggerRef={triggerRef} onVoted={onVoted} newsletter={newsletter} /></Suspense> : newsletterOpen ? <Suspense fallback={null}><NewsletterDialog {...newsletter} returnFocusRef={newsletterTriggerRef} /></Suspense> : null}
    </section>
  );
}
