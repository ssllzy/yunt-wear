"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeft, ArrowDown, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VoteNotice } from "@/components/vote-notice";
import { VoteButton } from "@/components/vote-button";
import type { Design } from "@/lib/collection";
import type { VotingState } from "@/hooks/use-votes";
import { NewsletterDialog, type NewsletterState } from "@/components/newsletter-dialog";

export default function ProductViewer({ design, origin, voting, onClose, triggerRef, onVoted, newsletter }: {
  design: Design;
  origin: { top: number; left: number; width: number; height: number } | null;
  voting: VotingState;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onVoted: () => void;
  newsletter: NewsletterState;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const bindContent = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    setContentNode(node);
  }, []);
  const galleryRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [frame, setFrame] = useState(0);

  useGSAP(() => {
    const content = contentRef.current;
    if (!content || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const top = Math.max(0, origin?.top ?? innerHeight / 3);
    const left = Math.max(0, origin?.left ?? innerWidth / 3);
    const bottom = Math.max(0, innerHeight - top - (origin?.height ?? innerHeight / 3));
    const right = Math.max(0, innerWidth - left - (origin?.width ?? innerWidth / 3));
    const timeline = gsap.timeline();
    timeline.fromTo(content, { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px)` }, { clipPath: "inset(0px 0px 0px 0px)", duration: 0.8, ease: "power3.inOut" });
    timeline.from(".viewer-photo:first-child img", { scale: 0.78, duration: 1, ease: "power3.out" }, 0);
    timeline.from(".viewer-details-inner, .viewer-toolbar", { opacity: 0, y: 16, duration: 0.55, stagger: 0.08 }, 0.45);
  }, { scope: contentRef, dependencies: [contentNode] });

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setFrame(Number((entry.target as HTMLElement).dataset.frame)); });
    }, { root: gallery, threshold: 0.55 });
    gallery.querySelectorAll(".viewer-photo").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [contentNode]);

  function close() {
    if (closing.current) return;
    closing.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onClose(); return; }
    gsap.to(contentRef.current, { opacity: 0, y: 20, duration: 0.3, ease: "power2.in", onComplete: onClose });
  }

  function goTo(index: number) {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const target = gallery.querySelectorAll<HTMLElement>(".viewer-photo")[index];
    gallery.scrollTo({ top: target?.offsetTop ?? 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <Dialog open onOpenChange={value => { if (!value) close(); }}>
    <DialogContent ref={bindContent} variant="fullscreen" showCloseButton={false}
      onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus({ preventScroll: true }); }}>
      <div className="viewer-toolbar"><Button variant="ghost" onClick={close} aria-label="Koleksiyona dön"><ArrowLeft data-icon="inline-start" /><span className="back-label">Koleksiyona dön</span></Button><span className="viewer-brand">YUNT</span><Button ref={closeButtonRef} variant="ghost" size="icon" aria-label="İncelemeyi kapat" onClick={close}><X /></Button></div>
      <div ref={galleryRef} className="viewer-gallery" tabIndex={0} aria-label="Ürün fotoğrafları; aşağı kaydırarak diğer fotoğrafları incele">
        {design.photos.map((photo, index) => <figure className="viewer-photo" key={photo.src} data-frame={index}>
          <img src={photo.src} alt={photo.alt} width="1120" height="1400" loading={index === 0 ? "eager" : "lazy"} decoding="async" />
          <figcaption>{String(index + 1).padStart(2, "0")} / {photo.label}</figcaption>
        </figure>)}
      </div>
      <aside className="viewer-details"><div className="viewer-details-inner">
        <p className="viewer-eyebrow">{design.category} / {design.number}</p>
        <DialogTitle className="viewer-title">{design.name}</DialogTitle>
        <DialogDescription className="viewer-description">{design.description ?? "Sade bir form. Kendine ait bir iz."}</DialogDescription>
        <dl className="viewer-features">{design.features.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="viewer-voting">{design.votingEnabled !== false && <VoteNotice voting={voting} />}<VoteButton id={design.id} enabled={design.votingEnabled} voting={voting} large onVoted={onVoted} /><p aria-live="polite">{design.votingEnabled === false ? "Bu tasarım yakında gelecek." : voting.votes?.selection ? "Oy hakkını kullandın. Seçimin değiştirilemez." : "Tek oy hakkın var. Seçimin değiştirilemez."}</p></div>
        {voting.error && <div className="viewer-error" role="alert"><p>{voting.error}</p><Button variant="link" onClick={() => void voting.refresh()}>Tekrar dene</Button></div>}
        <div className="viewer-pagination"><div className="photo-dots" data-many={design.photos.length > 8 ? "true" : undefined}>{design.photos.map((photo, index) => <button key={photo.src} className="photo-dot" aria-label={`${photo.label} fotoğrafını göster`} aria-current={frame === index ? "true" : undefined} onClick={() => goTo(index)}><span /></button>)}</div><span>{String(frame + 1).padStart(2, "0")} / {String(design.photos.length).padStart(2, "0")}</span><ArrowDown aria-hidden="true" /></div>
      </div></aside>
    </DialogContent>
    <NewsletterDialog {...newsletter} returnFocusRef={closeButtonRef} />
  </Dialog>;
}
