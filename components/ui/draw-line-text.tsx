"use client";

import { type ComponentProps, useId, useRef, useState } from "react";
import { optimizedPoster } from "@/lib/optimized-media";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP, ScrollTrigger);

type DrawTextProps = {
  afterFill?: boolean;
  color?: string;
  fontSize?: number;
  letterSpacing?: number;
  oneByOne?: boolean;
  strokeWidth?: number;
  text: string;
  wordSpacing?: number;
  videoSrc?: string;
  poster?: string;
} & ComponentProps<"svg">;

// Keeps the supplied API, but reveals filled letters instead of drawing their
// outlines. strokeWidth only reserves clip padding; it never paints a stroke.
export function DrawLineText({ text, oneByOne = true, afterFill = true, color = "black", fontSize = 240,
  wordSpacing = 20, strokeWidth = 2, letterSpacing = -12, videoSrc = "/media/steppe.mp4",
  poster = "/media/steppe-poster.jpg", style, ...props }: DrawTextProps) {
  const wrapperRef = useRef<SVGSVGElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackPoster = optimizedPoster(videoSrc, poster);
  const maskId = `draw-${useId().replace(/:/g, "")}`;
  const [dimension, setDimension] = useState({ width: fontSize * text.length * 0.74, height: fontSize * 1.2 });

  useGSAP(() => {
    const svg = wrapperRef.current;
    if (!svg) return;
    const letters = Array.from(svg.querySelectorAll<SVGTextElement>(".draw-letter"));
    const reveals = Array.from(svg.querySelectorAll<SVGRectElement>(".draw-letter-reveal"));
    const widths = letters.map(letter => letter.getComputedTextLength());
    const clipPadding = Math.max(6, strokeWidth, fontSize * 0.04);
    const height = fontSize * 1.2;
    let offset = clipPadding;
    letters.forEach((letter, index) => {
      letter.setAttribute("x", String(offset));
      const length = widths[index] || wordSpacing;
      reveals[index].setAttribute("x", String(offset - clipPadding));
      reveals[index].setAttribute("width", String(length + clipPadding * 2));
      offset += length + (index < letters.length - 1 ? letterSpacing : 0);
    });
    setDimension({ width: offset + clipPadding, height });

    const media = gsap.matchMedia();
    media.add({ reduced: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, context => {
      if (context.conditions?.reduced) {
        gsap.set(reveals, { attr: { y: 0, height } });
        return;
      }

      gsap.set(reveals, { attr: { y: height, height: 0 } });
      const timeline = gsap.timeline({ scrollTrigger: { trigger: svg, start: "top 84%", once: true } });
      timeline.to(reveals, {
        attr: { y: 0, height },
        duration: 1.4,
        stagger: oneByOne ? 0.16 : 0,
        ease: afterFill ? "power3.out" : "none",
      });
    });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const playback = () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = true;
      if (visible && !reducedMotion.matches && document.visibilityState === "visible") void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      playback();
    }, { threshold: 0.01, rootMargin: "250px 0px" });
    observer.observe(svg);
    document.addEventListener("visibilitychange", playback);
    reducedMotion.addEventListener("change", playback);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", playback);
      reducedMotion.removeEventListener("change", playback);
      videoRef.current?.pause();
      media.revert();
    };
  }, { scope: wrapperRef, dependencies: [text, fontSize, letterSpacing, oneByOne, afterFill, wordSpacing, strokeWidth, videoSrc, poster], revertOnUpdate: true });

  // Keep video in HTML. Safari can composite a video outside an SVG
  // foreignObject mask. An opaque SVG overlay cuts out only the glyphs.
  return (
    <div className="draw-text" style={{ aspectRatio: `${dimension.width} / ${dimension.height}`, backgroundColor: color }}>
      <video key={videoSrc} src={videoSrc} ref={videoRef} className="draw-text-video" muted loop playsInline preload="none" poster={fallbackPoster || undefined} aria-hidden="true" tabIndex={-1} disablePictureInPicture disableRemotePlayback controls={false} />
      <svg {...props} ref={wrapperRef} viewBox={`0 0 ${dimension.width} ${dimension.height}`} role="img" aria-label={text}
        style={{ userSelect: "none", width: "100%", ...style }}>
        <defs>
          {Array.from(text).map((_, index) => <clipPath key={index} id={`${maskId}-reveal-${index}`} clipPathUnits="userSpaceOnUse">
            <rect className="draw-letter-reveal" x="0" y="0" width="100%" height="100%" />
          </clipPath>)}
          <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width={dimension.width} height={dimension.height} style={{ maskType: "luminance" }}>
            <rect width={dimension.width} height={dimension.height} fill="white" />
            {Array.from(text).map((char, index) => <text key={index} className="draw-letter" y={fontSize}
              clipPath={`url(#${maskId}-reveal-${index})`} fill="black" stroke="none" fontSize={fontSize} fontWeight="900">{char}</text>)}
          </mask>
        </defs>
        <rect width={dimension.width} height={dimension.height} fill="white" mask={`url(#${maskId})`} />
      </svg>
    </div>
  );
}
