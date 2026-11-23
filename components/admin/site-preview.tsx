"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Monitor, Smartphone, MousePointer2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteContent, EditTarget } from "@/lib/site-content";

export function SitePreview({ content, target, iframeRef, onSelect }: { content: SiteContent; target: EditTarget; iframeRef: RefObject<HTMLIFrameElement | null>; onSelect: (target: EditTarget) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const latest = useRef(content); latest.current = content;
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: 700, height: 720 });
  useEffect(() => { if (window.innerWidth < 760) setMobile(true); }, []);
  function sendContent() { iframeRef.current?.contentWindow?.postMessage({ type: "yunt:content", content: latest.current }, location.origin); }
  useEffect(() => {
    const node = containerRef.current; if (!node) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    function message(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== iframeRef.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "yunt:ready") { setReady(true); sendContent(); }
      if (event.data.type === "yunt:select" && typeof event.data.target === "string") onSelect(event.data.target as EditTarget);
    }
    window.addEventListener("message", message); return () => window.removeEventListener("message", message);
  }, [iframeRef, onSelect]);
  useEffect(() => { if (ready) sendContent(); }, [content, ready]);
  useEffect(() => { if (ready) iframeRef.current?.contentWindow?.postMessage({ type: "yunt:scroll", target }, location.origin); }, [target, ready, iframeRef, mobile, size.width, size.height]);
  const width = mobile ? 390 : 1280;
  const scale = Math.max(0.15, Math.min(1, (size.width - 32) / width));
  const height = Math.max(500, (size.height - 32) / scale);
  return <section className="admin-preview" aria-label="Canlı site önizlemesi">
    <div className="admin-preview-toolbar"><span><MousePointer2 />Bir alana tıkla, düzenle</span><div><Button variant={mobile ? "ghost" : "secondary"} size="icon-sm" aria-label="Masaüstü önizleme" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor /></Button><Button variant={mobile ? "secondary" : "ghost"} size="icon-sm" aria-label="Telefon önizleme" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone /></Button><Button variant="ghost" size="icon-sm" asChild><a href="/" target="_blank" rel="noreferrer" aria-label="Yayındaki siteyi aç"><ExternalLink /></a></Button></div></div>
    <div ref={containerRef} className="admin-preview-canvas"><div className={`admin-frame-wrap ${mobile ? "is-mobile" : ""}`} style={{ width: width * scale, height: height * scale }}>
      <iframe ref={iframeRef} title="YUNT düzenlenebilir site önizlemesi" src="/yonetim/onizleme" style={{ width, height, transform: `scale(${scale})` }} />
    </div></div>
  </section>;
}
