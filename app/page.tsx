import { headers } from "next/headers";
import ConnectionPage from "@/components/ConnectionPage";
import { UAParser } from "ua-parser-js";
import { connectDB } from "@/lib/db";
import { AnalyticsEvent, DailyStat } from "@/lib/models";
import { getIPFromHeaders, ipPrefix, visitorId } from "@/lib/security";

export const dynamic = "force-dynamic";
export default async function Home() {
  const h = await headers();
  const ip = getIPFromHeaders(h);
  const ua = h.get("user-agent") || "";
  const parser = new UAParser(ua);
  const parsed = parser.getResult();
  const kind = parsed.device.type;
  let geo: Record<string, unknown> = {};
  if (ip && process.env.IPINFO_TOKEN) {
    try { const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${process.env.IPINFO_TOKEN}`, { next: { revalidate: 600 } }); if (res.ok) geo = await res.json(); } catch { /* Lookup remains optional. */ }
  } else if (ip) {
    try { const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { next: { revalidate: 600 } }); if (res.ok) geo = await res.json(); } catch { /* Lookup remains optional. */ }
  }
  const asn = typeof geo.org === "string" ? geo.org.split(" ")[0] : "";
  const isp = typeof geo.org === "string" ? geo.org.replace(/^AS\d+\s*/, "") : "";
  const info = {
    ip: typeof geo.ip === "string" ? geo.ip : ip || "Unavailable",
    country: typeof geo.country_name === "string" ? geo.country_name : typeof geo.country === "string" ? geo.country : "Unavailable",
    region: typeof geo.region === "string" ? geo.region : typeof geo.region_name === "string" ? geo.region_name : "Unavailable",
    city: typeof geo.city === "string" ? geo.city : "Unavailable",
    isp: isp || "Unavailable", asn: asn || "Unavailable",
    device: kind === "mobile" ? "Mobile" : kind === "tablet" ? "Tablet" : ua ? "Desktop" : "Unknown",
    os: [parsed.os.name, parsed.os.version].filter(Boolean).join(" ") || "Unknown",
    browser: [parsed.browser.name, parsed.browser.version].filter(Boolean).join(" ") || "Unknown",
  };
  let visitRecorded = false;
  if (ip) {
    try {
      const visitedAt = new Date();
      const device = info.device;
      await connectDB();
      await AnalyticsEvent.create({ visitedAt, country: info.country, region: info.region, city: info.city, isp: info.isp, asn: info.asn, device, os: info.os, browser: info.browser, ipAddress: ip, ipPrefix: ipPrefix(ip), visitorId: visitorId(ip, ua) });
      await DailyStat.updateOne({ date: visitedAt.toISOString().slice(0, 10) }, { $inc: { visits: 1, ...(device === "Mobile" ? { mobile: 1 } : device === "Desktop" ? { desktop: 1 } : device === "Tablet" ? { tablet: 1 } : {}) }, $set: { updatedAt: new Date() } }, { upsert: true });
      visitRecorded = true;
    } catch (error) { console.error("Automatic visit recording failed", error); }
  }
  return <ConnectionPage info={info} visitRecorded={visitRecorded} />;
}
