import { NextRequest, NextResponse } from "next/server";
import { UAParser } from "ua-parser-js";
import { connectDB } from "@/lib/db";
import { AnalyticsEvent, DailyStat } from "@/lib/models";
import { getClientIP, ipPrefix, visitorId } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rate = rateLimit(`analytics:${ip}`, 12, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object" || (body as Record<string, unknown>).consent !== true) return NextResponse.json({ error: "Consent is required" }, { status: 400 });
  if (!ip) return NextResponse.json({ error: "Connection address unavailable" }, { status: 400 });
  try {
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 512);
    const parsed = new UAParser(userAgent).getResult();
    const device = parsed.device.type === "mobile" ? "Mobile" : parsed.device.type === "tablet" ? "Tablet" : userAgent ? "Desktop" : "Unknown";
    let geo: Record<string, unknown> = {};
    const token = process.env.IPINFO_TOKEN;
    const lookupUrl = token ? `https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${token}` : `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
    try { const response = await fetch(lookupUrl, { signal: AbortSignal.timeout(4000), cache: "no-store" }); if (response.ok) geo = await response.json(); } catch { /* Record a valid visit even when IP lookup fails. */ }
    const org = typeof geo.org === "string" ? geo.org : "";
    const event = { visitedAt: new Date(), country: String(geo.country_name || geo.country || "Unknown").slice(0, 100), region: String(geo.region || geo.region_name || "Unknown").slice(0, 100), city: String(geo.city || "Unknown").slice(0, 100), isp: org.replace(/^AS\d+\s*/, "").slice(0, 150) || "Unknown", asn: org.split(" ")[0]?.slice(0, 30) || "Unknown", device, os: [parsed.os.name, parsed.os.version].filter(Boolean).join(" ").slice(0, 100) || "Unknown", browser: [parsed.browser.name, parsed.browser.version].filter(Boolean).join(" ").slice(0, 100) || "Unknown", ipPrefix: ipPrefix(ip), visitorId: visitorId(ip, userAgent) };
    await connectDB();
    await AnalyticsEvent.create(event);
    await DailyStat.updateOne({ date: event.visitedAt.toISOString().slice(0, 10) }, { $inc: { visits: 1, ...(device === "Mobile" ? { mobile: 1 } : device === "Desktop" ? { desktop: 1 } : device === "Tablet" ? { tablet: 1 } : {}) }, $set: { updatedAt: new Date() } }, { upsert: true });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { console.error("Analytics recording failed", error); return NextResponse.json({ error: "Unable to save visit" }, { status: 503 }); }
}
