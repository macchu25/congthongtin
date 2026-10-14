import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import { Admin } from "../lib/models";

dotenv.config({ path: ".env.local" });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in .env.local first.");
  await connectDB();
  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.updateOne({ email }, { $set: { passwordHash }, $setOnInsert: { email } }, { upsert: true });
  console.log(`Administrator provisioned: ${email}`);
  await import("mongoose").then(m=>m.default.disconnect());
}
main().catch(e=>{console.error(e);process.exit(1)});
