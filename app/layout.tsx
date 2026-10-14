import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Connection Check — Your connection, clearly.", description: "A simple, private way to see your current internet connection details." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
