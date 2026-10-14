import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AnalyticsEvent } from "@/lib/models";
import { getSession } from "@/lib/security";
const quote = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export async function GET(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB(); const params = request.nextUrl.searchParams;
  const from = params.get("from"), to = params.get("to");
  const match: Record<string, unknown> = {};
  if (from || to) match.visitedAt = { ...(from ? { $gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
  const rows = await AnalyticsEvent.find(match).sort({ visitedAt: -1 }).limit(10_000).select("visitedAt ipAddress country region city isp device os browser").lean();
  const header = ["Timestamp","IP address","Country","Region","City","ISP","Device","Operating system","Browser"].map(quote).join(",");
  const data = rows.map(x=>[x.visitedAt.toISOString(),x.ipAddress,x.country,x.region,x.city,x.isp,x.device,x.os,x.browser].map(quote).join(","));
  return new NextResponse([header,...data].join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="connection-report-${new Date().toISOString().slice(0,10)}.csv"`, "Cache-Control": "no-store" } });
}
