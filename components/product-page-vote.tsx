"use client";

import { lazy, Suspense, useRef, useState } from "react";
import { VoteNotice } from "@/components/vote-notice";
import { VoteButton } from "@/components/vote-button";
import { useVotes } from "@/hooks/use-votes";

const NewsletterDialog = lazy(() => import("@/components/newsletter-dialog").then(module => ({ default: module.NewsletterDialog })));

export function ProductPageVote({ id, enabled }: { id: string; enabled: boolean }) {
  const voting = useVotes();
  const newsletterTrigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div>
      {enabled && <VoteNotice voting={voting} />}
      <VoteButton id={id} enabled={enabled} voting={voting} onVoted={() => setOpen(true)} />
      {voting.votes?.selection && <p role="status">Oyun kaydedildi. Seçimin değiştirilemez.</p>}
      {voting.votes?.selection && <button ref={newsletterTrigger} type="button" onClick={() => setOpen(true)}>{subscribed ? "Kaydını görüntüle" : "%20 indirim için kaydol"}</button>}
      {voting.error && <p role="alert">{voting.error} <button type="button" onClick={() => void voting.refresh()}>Tekrar dene</button></p>}
      {open && <Suspense fallback={null}>
        <NewsletterDialog returnFocusRef={newsletterTrigger} open={open} onOpenChange={setOpen} subscribed={subscribed} onSubscribed={() => setSubscribed(true)} />
      </Suspense>}
    </div>
  );
}
