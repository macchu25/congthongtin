import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Admin } from "@/lib/models";
import { createSession, getClientIP, safeEqual, sameOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = rateLimit(`login:${getClientIP(request)}`, 5, 15 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
    if (!email.includes("@") || !password) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
    await connectDB();
    const user = await Admin.findOne({ email }).lean();
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : safeEqual(password, "unmatchable-password-sentinel");
    if (!user || !ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    await createSession(user.email);
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("Admin login failed", error); return NextResponse.json({ error: "Unable to sign in." }, { status: 503 }); }
}
