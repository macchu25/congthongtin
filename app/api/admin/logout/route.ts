import { NextRequest, NextResponse } from "next/server";
import { clearSession, getSession, sameOrigin } from "@/lib/security";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await clearSession(); return NextResponse.json({ ok: true });
}
