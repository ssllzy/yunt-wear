import { adminGuard } from "@/lib/admin-access";
import { readTrafficArchive, readTrafficReport } from "@/lib/traffic-server";
import { trafficCsv } from "@/lib/traffic-report";
import { voteResponse } from "@/lib/voting-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const archive = params.get("archive");
  if (archive && !/^[1-9]\d{0,12}$/.test(archive)) return voteResponse({ error: "Geçersiz arşiv." }, 400);
  try {
    if (archive || params.get("format") === "csv") {
      const report = archive ? await readTrafficArchive(Number(archive)) : (await readTrafficReport()).current;
      if (!report) return voteResponse({ error: "Arşiv bulunamadı." }, 404);
      return new Response(trafficCsv(report), { headers: {
        "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="YUNT-ziyaretci-${report.start.slice(0,10)}-${report.end.slice(0,10)}.csv"`,
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow",
      } });
    }
    return voteResponse(await readTrafficReport());
  } catch { return voteResponse({ error: "Ziyaretçi raporu yüklenemedi. Tekrar dene." }, 503); }
}
