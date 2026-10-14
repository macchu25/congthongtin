import { headers } from "next/headers";
import ConnectionPage from "@/components/ConnectionPage";
import { UAParser } from "ua-parser-js";

export const dynamic = "force-dynamic";
export default async function Home() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ip = forwarded.replace(/^\[|\]$/g, "");
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
  return <ConnectionPage info={info} />;
}
