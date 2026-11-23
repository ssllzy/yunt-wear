"use client";

import { ArrowUpRight } from "lucide-react";
import type { MouseEvent } from "react";
import { Hero } from "@/components/hero";
import { Collection } from "@/components/collection";
import { BrandMark } from "@/components/brand-mark";
import type { EditTarget, SiteContent } from "@/lib/site-content";

export function SiteExperience({ content, editing = false, onSelect }: { content: SiteContent; editing?: boolean; onSelect?: (target: EditTarget) => void }) {
  function select(event: MouseEvent<HTMLDivElement>) {
    if (!editing) return;
    const target = (event.target as Element).closest<HTMLElement>("[data-edit-target]");
    if (target?.dataset.editTarget) { event.preventDefault(); event.stopPropagation(); onSelect?.(target.dataset.editTarget as EditTarget); }
    else if ((event.target as Element).closest("button")) { event.preventDefault(); event.stopPropagation(); }
  }
  return <div className={editing ? "site-editing" : undefined} onClickCapture={editing ? select : undefined}>
    <a className="skip-link" href="#koleksiyon">Koleksiyona geç</a>
    <header className="site-header"><a className="nav-brand" href="#baslangic" aria-label={`${content.navbar.text} ana sayfa`}>
      <span className="nav-logo" data-edit-target="navbar.logo">{content.navbar.logo ? <img src={content.navbar.logo} alt={content.navbar.logoAlt} width="28" height="32" /> : <BrandMark aria-hidden="true" />}</span>
      <span data-edit-target="navbar.text">{content.navbar.text}</span>
    </a><nav aria-label="Ana menü"><a href="#koleksiyon" data-edit-target="navbar.linkText">{content.navbar.linkText} <ArrowUpRight className="nav-arrow" aria-hidden="true" /></a></nav></header>
    <main><Hero videoSrc={content.hero.video} poster={content.hero.poster} /><Collection content={content} preview={editing} />
      <section id="hakkimizda" className="site-about" aria-labelledby="about-title">
        <p className="site-about-label">Hakkımızda</p>
        <h2 id="about-title">Bozkırdan sokağa.</h2>
        <p>YUNT’ta Türk kültürünün motiflerini bol kalıp sokak giyimiyle buluşturuyoruz. Su yolu motifini deriyle kol boyunca taşıyor, halı desenlerini ceketin yakasına ve omuzlarına yayıyoruz. Her parçada deseni, kıyafetin kesimiyle birlikte düşünüyoruz.</p>
        <p>İlk koleksiyonumuz için beş tasarım hazırladık. Hangisini sokakta görmek istediğini oyunla bize söyle.</p>
      </section>
    </main>
    <footer className="site-footer" data-edit-target="footer"><a href="#baslangic">{content.footer.text}</a><span>{content.footer.tagline}</span><div className="footer-links"><a className="footer-instagram" href="https://www.instagram.com/yuntwear/" target="_blank" rel="noopener noreferrer" aria-label="Instagram: @yuntwear (yeni sekmede açılır)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg></a><span>© 2026</span></div></footer>
  </div>;
}
