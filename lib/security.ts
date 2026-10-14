import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "ipcheck_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "");
export async function createSession(email: string) {
  const token = await new SignJWT({ email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}
export async function getSession() {
  try { const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) return null; const { payload } = await jwtVerify(token, secret()); return typeof payload.email === "string" ? payload.email : null; } catch { return null; }
}
export async function clearSession() { (await cookies()).delete(SESSION_COOKIE); }
export function safeEqual(a: string, b: string) { const aa = Buffer.from(a), bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export function visitorId(ip: string, userAgent: string, month = new Date().toISOString().slice(0, 7)) {
  const secret = process.env.ANALYTICS_SECRET;
  if (!secret) throw new Error("ANALYTICS_SECRET is not configured");
  return createHmac("sha256", secret).update(`${month}|${ip}|${userAgent}`).digest("hex");
}
export function ipPrefix(ip: string) { if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + "::"; return ip.split(".").slice(0, 3).join(".") + ".0"; }
export function getClientIP(request: NextRequest) {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  return raw.replace(/^\[|\]$/g, "").slice(0, 64);
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}
export function requireAdminResponse(request?: NextRequest) {
  if (request && !sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
