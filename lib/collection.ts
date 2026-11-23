export type Design = {
  id: string;
  number: string;
  name: string;
  category: string;
  image: string;
  imageAlt: string;
  photos: { src: string; alt: string; label: string }[];
  features: [string, string][];
  description?: string;
  color?: string;
  enabled?: boolean;
  votingEnabled?: boolean;
};

const photos = [
  { src: "/media/product-front.webp", alt: "Siyah fermuarlı üst, göğüste beyaz at başı; önden görünüm", label: "Ön" },
  { src: "/media/product-back.webp", alt: "Siyah üst, arkada küçük beyaz YUNT yazısı", label: "Arka" },
  { src: "/media/product-detail.webp", alt: "Beyaz at başı nakışı ve fermuar yakın planı", label: "Detay" },
];

const suYoluPhotos = [
  { label: "Ön", view: "önden görünüm" },
  { label: "Ön sağ", view: "sağ ön açıdan deri kol detayı" },
  { label: "Sağ", view: "sağ yandan görünüm" },
  { label: "Arka", view: "arka desen ve kapüşon görünümü" },
  { label: "Sol", view: "sol yandan görünüm" },
  { label: "Ön sol", view: "sol ön açıdan deri kol detayı" },
  { label: "Üst", view: "üst açıdan omuz ve kapüşon görünümü" },
  ...Array.from({ length: 8 }, (_, index) => ({ label: `360° / ${String(index + 1).padStart(2, "0")}`, view: `${index + 1}. dönüş açısı` })),
].map((photo, index) => ({
  src: `/media/su-yolu/${String(index + 1).padStart(2, "0")}.webp`,
  alt: `Su Yolu: siyah deri işlemeli fermuarlı kapüşonlu, ${photo.view}; CLO 3D tasarım görseli`,
  label: photo.label,
}));

export const designs: Design[] = Array.from({ length: 5 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `design-${number}`,
    number,
    name: `YUNT ${number}`,
    category: "KOLEKSİYON 01",
    image: "/media/product-card.webp",
    imageAlt: `YUNT ${number}: siyah fermuarlı üst ve beyaz at başı`,
    photos,
    features: [["Renk", "Siyah"], ["Simge", "Beyaz at başı"], ["Form", "Fermuarlı"]],
    ...(index === 0 && {
      name: "Su Yolu",
      image: "/media/su-yolu/02.webp",
      imageAlt: "Su Yolu: koldan omuza uzanan deri su yolu işlemeli siyah fermuarlı kapüşonlu; CLO 3D tasarım görseli",
      photos: suYoluPhotos,
      features: [["Renk", "Siyah"], ["Detay", "Deri su yolu"], ["Form", "Fermuarlı"]] as [string, string][],
    }),
  };
});
