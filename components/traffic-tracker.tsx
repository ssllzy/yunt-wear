"use client";
import { useEffect, useRef } from "react";

export function TrafficTracker() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || window.self !== window.top) return;
    const send = () => {
      if (sent.current || document.visibilityState !== "visible") return;
      sent.current = true;
      // Send only the referring origin, never paths, query strings or the full browsing URL.
      let referrer = "";
      try { referrer = document.referrer ? new URL(document.referrer).origin : ""; } catch { /* no source */ }
      void fetch("/api/traffic", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referrer }), keepalive: true }).catch(() => {});
    };
    const timer = window.setTimeout(send, 250);
    document.addEventListener("visibilitychange", send);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", send); };
  }, []);
  return null;
}
