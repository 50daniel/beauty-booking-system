import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "美容店預約系統",
  description: "Next.js + PostgreSQL 美容店預約系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
