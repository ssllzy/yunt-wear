import { optimizedPoster } from "@/lib/optimized-media";
import { SiteExperience } from "@/components/site-experience";
import { readPublishedContent } from "@/lib/content-server";
import { TrafficTracker } from "@/components/traffic-tracker";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const content = await readPublishedContent();
  const poster = optimizedPoster(content.hero.video, content.hero.poster);
  return <>{poster && <link rel="preload" as="image" href={poster} fetchPriority="high" />}<SiteExperience content={content} /><TrafficTracker /></>;
}
