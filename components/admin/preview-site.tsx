"use client";

import { useEffect, useState } from "react";
import { SiteExperience } from "@/components/site-experience";
import { siteContentSchema, type EditTarget, type SiteContent } from "@/lib/site-content";

export function PreviewSite({ initialContent }: { initialContent: SiteContent }) {
  const [content, setContent] = useState(initialContent);
  useEffect(() => {
    function message(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== parent || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "yunt:content") {
        const result = siteContentSchema.safeParse(event.data.content);
        if (result.success) setContent(result.data);
      }
      if (event.data.type === "yunt:scroll") {
        const target = event.data.target;
        if (typeof target !== "string") return;
        const node = Array.from(document.querySelectorAll<HTMLElement>("[data-edit-target]")).find(el => el.dataset.editTarget === target);
        if (!node) return;
        const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height")) || 64;
        const product = target.startsWith("product:");
        // scrollIntoView can also move ancestors outside this iframe. Only
        // scroll this preview's window and its own horizontal product rail.
        const top = target.startsWith("navbar.") ? 0 : node.getBoundingClientRect().top + window.scrollY - (product ? (window.innerHeight - node.offsetHeight) / 2 : navHeight);
        window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
        if (product) {
          const rail = node.closest<HTMLElement>(".product-rail");
          rail?.scrollTo({ left: node.offsetLeft - rail.offsetLeft - (rail.clientWidth - node.offsetWidth) / 2, behavior: "instant" });
        }
      }
    }
    window.addEventListener("message", message);
    parent.postMessage({ type: "yunt:ready" }, location.origin);
    return () => window.removeEventListener("message", message);
  }, []);
  function select(target: EditTarget) { parent.postMessage({ type: "yunt:select", target }, location.origin); }
  return <SiteExperience content={content} editing onSelect={select} />;
}
