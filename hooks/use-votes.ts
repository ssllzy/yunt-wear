"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoteSnapshot = { counts: Record<string, number>; selection: string | null; total: number; acknowledged: boolean };

async function readSnapshot(response: Response, acceptConflict = false): Promise<VoteSnapshot> {
  const body: unknown = await response.json();
  if ((!response.ok && !(acceptConflict && response.status === 409)) || !body || typeof body !== "object" || !("counts" in body) || !("selection" in body) || !("total" in body)) {
    throw new Error("Oylama yanıtı alınamadı.");
  }
  return body as VoteSnapshot;
}

export function useVotes(preview = false) {
  const [votes, setVotes] = useState<VoteSnapshot | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const generation = useRef(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (busy.current) return;
    const version = generation.current;
    try {
      const response = await fetch("/api/votes", { cache: "no-store", credentials: "same-origin", signal });
      const body = await readSnapshot(response);
      if (!busy.current && version === generation.current) {
        setVotes(body);
        setError("");
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      if (version === generation.current) setError("Oylar yüklenemedi. Tekrar deneyebilirsin.");
    }
  }, []);

  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(controller.signal); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, preview]);

  const acknowledge = useCallback(async () => {
    if (preview || busy.current || !votes || votes.selection || votes.acknowledged) return false;
    busy.current = true;
    generation.current += 1;
    setAcknowledging(true);
    setError("");
    try {
      const response = await fetch("/api/votes", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge" }),
      });
      if (!response.ok) throw new Error();
      setVotes(current => current ? { ...current, acknowledged: true } : current);
      return true;
    } catch {
      setError("Onay kaydedilemedi. Tekrar dene.");
      return false;
    } finally {
      busy.current = false;
      setAcknowledging(false);
    }
  }, [preview, votes]);

  const vote = useCallback(async (designId: string) => {
    if (busy.current || !votes?.acknowledged || votes.selection) return false;
    busy.current = true;
    generation.current += 1;
    setPending(designId);
    setError("");
    try {
      const response = await fetch("/api/votes", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId }),
      });
      if (response.status === 403) {
        const body: unknown = await response.json();
        setError(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "Bu tasarım şu anda oylamaya kapalı.");
        return false;
      }
      const body = await readSnapshot(response, true);
      setVotes(body);
      if (response.status === 409) {
        setError("Oy hakkını zaten kullandın. Seçimin değiştirilemez.");
        return false;
      }
      return body.selection === designId;
    } catch {
      setError("Oyun kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
      return false;
    } finally {
      busy.current = false;
      setPending(null);
    }
  }, [votes]);

  return { votes, pending, acknowledging, error, vote, refresh, acknowledge };
}

export type VotingState = ReturnType<typeof useVotes>;
