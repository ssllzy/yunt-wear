"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { ArrowUpRight, Check, LoaderCircle, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type NewsletterState = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscribed: boolean;
  onSubscribed: () => void;
};

export function NewsletterDialog({ open, onOpenChange, subscribed, onSubscribed, returnFocusRef }: NewsletterState & {
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const [pending, setPending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (open && subscribed) titleRef.current?.focus({ preventScroll: true });
  }, [open, subscribed]);

  function setOpen(next: boolean) {
    if (!next) { setConsent(false); setError(""); }
    onOpenChange(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!consent) { setError("Haber listesine katılmak için e-posta iznini işaretle."); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    const fullName = String(data.get("fullName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (fullName.length < 2) { setError("Adını ve soyadını yaz."); return; }
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, consent: true }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" || !("subscribed" in result) || result.subscribed !== true) {
        const message = response.status === 400 ? "Ad soyad ve e-posta bilgilerini kontrol et." : response.status === 403 ? "Kayıt olmadan önce bir tasarıma oy ver." : "Kaydın tamamlanamadı. Biraz sonra tekrar dene.";
        setError(message);
        return;
      }
      form.reset();
      setConsent(false);
      onSubscribed();
    } catch {
      setError("Kaydın tamamlanamadı. Biraz sonra tekrar dene.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent variant="newsletter" showCloseButton={false}
      onCloseAutoFocus={event => { event.preventDefault(); returnFocusRef.current?.focus({ preventScroll: true }); }}>
      <DialogClose asChild><Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Kayıt penceresini kapat"><X /></Button></DialogClose>
      <div className="newsletter-heading">
        <span className="newsletter-eyebrow">YUNT</span>
        {subscribed ? <div className="newsletter-success-icon"><Check aria-hidden="true" /></div> : <p className="newsletter-offer" aria-label="Yüzde 20 indirim">%20</p>}
        <DialogTitle ref={titleRef} tabIndex={-1}>{subscribed ? "Listedesin." : "İlk sen haberdar ol."}</DialogTitle>
        <DialogDescription>{subscribed ? "%20 indirim hakkın kaydedildi. Ürün çıktığında e-posta adresine haber vereceğiz." : "Ürün çıktığında haberin olsun. Haber listesine katıl, %20 indirim hakkını kaydet."}</DialogDescription>
      </div>
      {subscribed ? <Button size="ballot-lg" onClick={() => setOpen(false)}>Tamam<ArrowUpRight data-icon="inline-end" /></Button> : <form onSubmit={submit} className="newsletter-form">
        <FieldGroup>
          <Field><FieldLabel htmlFor="newsletter-name">Ad soyad</FieldLabel><Input id="newsletter-name" name="fullName" autoComplete="name" placeholder="Adın ve soyadın" required minLength={2} maxLength={120} disabled={pending} /></Field>
          <Field><FieldLabel htmlFor="newsletter-email">E-posta</FieldLabel><Input id="newsletter-email" name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="E-posta adresin" required maxLength={254} disabled={pending} /></Field>
          <Field orientation="horizontal" className="newsletter-consent"><Checkbox id="newsletter-consent" checked={consent} onCheckedChange={value => setConsent(value === true)} disabled={pending} /><FieldLabel htmlFor="newsletter-consent">YUNT’un ürün çıkışı ve %20 indirim hakkım hakkında bana e-posta göndermesini kabul ediyorum.</FieldLabel></Field>
        </FieldGroup>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <Button type="submit" size="ballot-lg" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydol, %20 indirim kazan"}{pending ? <LoaderCircle data-icon="inline-end" className="animate-spin" /> : <ArrowUpRight data-icon="inline-end" />}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Şimdi değil</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}
