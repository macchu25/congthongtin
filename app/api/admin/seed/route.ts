import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Admin } from "@/lib/models";
import { safeEqual, sameOrigin } from "@/lib/security";
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Use the seed script." }, { status: 404 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email, password, key } = await request.json().catch(()=>({}));
  if (!process.env.ADMIN_SETUP_KEY || !safeEqual(String(key||""), process.env.ADMIN_SETUP_KEY)) return NextResponse.json({ error: "Invalid setup key." }, { status: 403 });
  if (typeof email !== "string" || typeof password !== "string" || password.length < 12) return NextResponse.json({ error: "Use an email and a password of at least 12 characters." }, { status: 400 });
  await connectDB();
  const normalized = email.trim().toLowerCase();
  await Admin.updateOne({ email: normalized }, { $setOnInsert: { email: normalized, passwordHash: await bcrypt.hash(password, 12) } }, { upsert: true });
  return NextResponse.json({ ok: true });
}
