import type { Metadata } from "next";
import "./globals.css";
import {headers} from "next/headers";
import {SITE_URL} from "@/lib/site-url";

export const metadata: Metadata = {
  title: "YUNT — Kendi izini bırak",
  description: "YUNT WEAR. Bozkırdan doğan bir iz. Koleksiyonu keşfet, bir sonraki tasarımı sen seç.",
  metadataBase: new URL(SITE_URL),
  applicationName: "YUNT WEAR",
  alternates: {canonical: "/"},
  robots: {index:true,follow:true},
  openGraph: {type:"website",locale:"tr_TR",siteName:"YUNT WEAR",title:"YUNT — Kendi izini bırak",description:"Bozkırdan doğan bir iz. YUNT koleksiyonunu keşfet ve tasarımını seç.",url:SITE_URL},
  twitter: {card:"summary_large_image",title:"YUNT — Kendi izini bırak",description:"YUNT koleksiyonunu keşfet ve tasarımını seç."},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce=(await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="tr">
      <body className="antialiased">{children}<script suppressHydrationWarning nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"WebSite",name:"YUNT WEAR",url:SITE_URL,inLanguage:"tr-TR",about:{"@type":"Brand",name:"YUNT WEAR",url:SITE_URL}}).replace(/</g,"\\u003c")}} /></body>
    </html>
  );
}
