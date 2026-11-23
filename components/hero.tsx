"use client";

import { useEffect, useRef, useState } from "react";
import { optimizedPoster } from "@/lib/optimized-media";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BRAND_VIEWBOX, HORSE_PATH, WORDMARK_PATH } from "@/components/brand-mark";
import "./hero.css";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP, MorphSVGPlugin, ScrollTrigger);

export function Hero({ videoSrc = "/media/steppe.mp4", poster = "/media/steppe-poster.jpg" }: { videoSrc?: string; poster?: string }) {
  const fallbackPoster = optimizedPoster(videoSrc, poster);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wordmarkRef = useRef<SVGPathElement>(null);
  const markWrapperRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => { setVideoFailed(false); }, [videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage || videoFailed) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let disposed = false;

    const updatePlayback = () => {
      if (disposed) return;
      video.muted = true;
      if (visible && !document.hidden && !reducedMotion.matches) {
        // Autoplay may be blocked by a browser or low-power mode; the poster
        // stays visible and the opening still has a complete visual state.
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        updatePlayback();
      },
      { threshold: 0.01 },
    );
    observer.observe(stage);
    document.addEventListener("visibilitychange", updatePlayback);
    reducedMotion.addEventListener("change", updatePlayback);

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", updatePlayback);
      reducedMotion.removeEventListener("change", updatePlayback);
      video.pause();
    };
  }, [videoFailed, videoSrc]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      const mark = markWrapperRef.current;
      const wordmark = wordmarkRef.current;
      if (!section || !stage || !mark || !wordmark) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: () => `top ${getComputedStyle(stage).top}`,
            end: () => `+=${Math.max(1, section.offsetHeight - stage.offsetHeight)}`,
            scrub: 0.45,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .to(wordmark, {
            morphSVG: { shape: HORSE_PATH, map: "position", shapeIndex: "auto" },
            duration: 0.68,
            ease: "power1.inOut",
          }, 0.08)
          .to(mark, {
            scale: () => Math.min(1, 470 / mark.offsetWidth),
            duration: 0.68,
            ease: "power1.inOut",
          }, 0.08)
          .to(shadeRef.current, { opacity: 0.4, duration: 0.72 }, 0.08)
          .to(mark, {
            scale: () => Math.min(0.92, 415 / mark.offsetWidth),
            y: -20,
            duration: 0.2,
          }, 0.8);
      });

      return () => media.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="baslangic" className="yunt-hero" aria-labelledby="yunt-title" data-edit-target="hero.video">
      <div ref={stageRef} className="yunt-hero-stage">
        <div className="yunt-hero-backdrop" aria-hidden="true">
          <div className="yunt-hero-poster" style={{ backgroundImage: fallbackPoster ? `url(${JSON.stringify(fallbackPoster)})` : "none" }} />
          {!videoFailed ? (
            <video
              ref={videoRef}
              key={videoSrc}
              className="yunt-hero-video"
              src={videoSrc}
              poster={fallbackPoster || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              onError={() => setVideoFailed(true)}
              tabIndex={-1}
            />
          ) : null}
          <div ref={shadeRef} className="yunt-hero-shade" />
        </div>

        <h1 id="yunt-title" className="yunt-hero-accessible-title">YUNT</h1>
        <div ref={markWrapperRef} className="yunt-hero-mark" aria-hidden="true">
          <svg viewBox={BRAND_VIEWBOX} fill="currentColor" focusable="false">
            <path ref={wordmarkRef} d={WORDMARK_PATH} fillRule="evenodd" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </section>
  );
}
