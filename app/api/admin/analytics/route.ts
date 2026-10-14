import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AnalyticsEvent, DailyStat } from "@/lib/models";
import { getSession } from "@/lib/security";
import { dateDaysAgo } from "@/lib/format";

export async function GET(request: NextRequest) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const params = request.nextUrl.searchParams;
  const range = Math.min(30, Math.max(1, Number(params.get("range")) || 30));
  const filter: Record<string, unknown> = { visitedAt: { $gte: dateDaysAgo(range) } };
  for (const field of ["country", "region", "device"] as const) { const value = params.get(field)?.trim(); if (value) filter[field] = { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }; }
  const from = params.get("from"), to = params.get("to");
  if (from || to) filter.visitedAt = { ...(from ? { $gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
  const events = await AnalyticsEvent.find(filter).sort({ visitedAt: -1 }).limit(500).select("visitedAt country region city isp asn device os browser").lean();
  const since7 = dateDaysAgo(7), since30 = dateDaysAgo(30), today = new Date(); today.setUTCHours(0,0,0,0);
  const [total, unique, todayCount, seven, thirty, daily] = await Promise.all([
    AnalyticsEvent.countDocuments({}), AnalyticsEvent.distinct("visitorId", { visitedAt: { $gte: since30 } }).then(x=>x.length), AnalyticsEvent.countDocuments({ visitedAt: { $gte: today } }), AnalyticsEvent.countDocuments({ visitedAt: { $gte: since7 } }), AnalyticsEvent.countDocuments({ visitedAt: { $gte: since30 } }), DailyStat.find({ date: { $gte: since30.toISOString().slice(0,10) } }).sort({ date: 1 }).lean(),
  ]);
  const aggregate = async (field: string) => AnalyticsEvent.aggregate([{ $match: { visitedAt: { $gte: since30 } } }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]);
  const [devices, browsers, systems, countries, regions] = await Promise.all([aggregate("device"),aggregate("browser"),aggregate("os"),aggregate("country"),aggregate("region")]);
  return NextResponse.json({ kpis: { total, unique, today: todayCount, seven, thirty }, daily, distributions: { devices, browsers, systems, countries, regions }, events }, { headers: { "Cache-Control": "no-store" } });
}
