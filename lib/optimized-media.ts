import cardVariants from "@/lib/card-image-variants.json";

export const DEFAULT_POSTER = "/media/steppe-poster.webp";

export function optimizedPoster(video: string, poster: string) {
  if (poster === "/media/steppe-poster.jpg") return DEFAULT_POSTER;
  return poster || (video === "/media/steppe.mp4" ? DEFAULT_POSTER : "");
}

export function cardImageSources(src: string) {
  const srcSet = (cardVariants as Record<string, string>)[src];
  return srcSet ? { srcSet, sizes: "(max-width: 333px) 240px, (max-width: 700px) 72vw, 19vw" } : {};
}
