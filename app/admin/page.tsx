import AdminApp from "@/components/AdminApp";
import { getSession } from "@/lib/security";
export const dynamic = "force-dynamic";
export default async function AdminPage() { const email = await getSession(); return <AdminApp initialEmail={email}/>; }
