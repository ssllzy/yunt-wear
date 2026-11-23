"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import type { VotingState } from "@/hooks/use-votes";

export function VoteNotice({ voting, overlay = false, preview = false, onAcknowledged }: {
  voting: VotingState;
  overlay?: boolean;
  preview?: boolean;
  onAcknowledged?: () => void;
}) {
  const title = useId();
  if (!preview && (voting.votes?.selection !== null || voting.votes.acknowledged)) return null;

  return (
    <aside className={overlay ? "collection-vote-intro vote-notice-overlay" : "collection-vote-intro"} aria-labelledby={title}>
      <h3 id={title}>Tek oy. Tek tasarım. Tek hikâye.</h3>
      <p>Beş tasarımı incele ve üretimde görmek istediğin parçaya oy ver. Tek oy hakkın var. Oyunu verdikten sonra seçimini değiştiremezsin.</p>
      <Button type="button" disabled={preview || voting.acknowledging}
        onClick={async () => { if (await voting.acknowledge()) onAcknowledged?.(); }}>
        {voting.acknowledging ? "Kaydediliyor…" : "Anladım"}
      </Button>
    </aside>
  );
}
