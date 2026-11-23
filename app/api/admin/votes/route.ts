import { designIds } from "@/db/schema";
import { adminGuard } from "@/lib/admin-access";
import { readVoteTotals, voteResponse } from "@/lib/voting-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const rows = await readVoteTotals();
    const counts: Record<string, number> = Object.fromEntries(designIds.map(id => [id, 0]));
    for (const row of rows) counts[row.designId] = Number(row.votes);
    return voteResponse({ counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0), updatedAt: new Date().toISOString() });
  } catch {
    return voteResponse({ error: "Oy sonuçları yüklenemedi. Tekrar dene." }, 503);
  }
}
