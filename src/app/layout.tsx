import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartBell Local - Sistem Bel Otomatis Sekolah",
  description: "Sistem Bel Otomatis Sekolah Berbasis Web Lokal Offline-first",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
