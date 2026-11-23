"use client";

import { Check, ArrowUpRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VotingState } from "@/hooks/use-votes";

export function VoteButton({ id, voting, large = false, onVoted, enabled = true }: { id: string; voting: VotingState; large?: boolean; enabled?: boolean; onVoted?: () => void }) {
  if (!enabled) return <Button variant={large ? "default" : "ballot"} size={large ? "ballot-lg" : "ballot"} disabled aria-label={`${id.slice(-2)} numaralı tasarım yakında gelecek`}><span>Yakında gelecek</span></Button>;
  const selected = voting.votes?.selection === id;
  const loading = voting.pending === id;
  const locked = !!voting.votes?.selection;
  return (
    <Button variant={large ? "default" : "ballot"} size={large ? "ballot-lg" : "ballot"}
      aria-label={selected ? `${id.slice(-2)} numaralı tasarıma oy verdin` : locked ? "Oy hakkını kullandın" : `${id.slice(-2)} numaralı tasarıma oy ver`}
      aria-pressed={selected} disabled={!voting.votes?.acknowledged || !!voting.pending || locked}
      data-vote-locked={locked && !selected ? "true" : undefined}
      onClick={async () => { if (await voting.vote(id)) onVoted?.(); }}>
      <span>{loading ? "Kaydediliyor" : selected ? "Oy verdin" : "Oy ver"}</span>
      {loading ? <LoaderCircle data-icon="inline-end" className="animate-spin" /> : selected ? <Check data-icon="inline-end" /> : <ArrowUpRight data-icon="inline-end" />}
    </Button>
  );
}
