"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [systemOverview, setSystemOverview] = useState<any>(null);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Cek autentikasi
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setIsLoadingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Ambil ringkasan sistem secara berkala untuk indikator header
  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await fetch("/api/player/next-bell");
        if (res.ok) {
          const data = await res.json();
          setSystemOverview(data);
        }
      } catch {}
    }

    fetchOverview();
    const interval = setInterval(fetchOverview, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const handleQuickSoundTest = async () => {
    setIsTestingSound(true);
    setToastMessage("Mengirim sinyal tes suara ke halaman pemutar...");
    try {
      const res = await fetch("/api/player/test-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: 85, repeatCount: 1 }),
      });
      if (res.ok) {
        setToastMessage("Tes suara terkirim! Pastikan halaman /player aktif.");
      } else {
        setToastMessage("Gagal memicu tes suara.");
      }
    } catch {
      setToastMessage("Gagal menghubungi server untuk tes suara.");
    } finally {
      setTimeout(() => {
        setIsTestingSound(false);
      }, 2000);
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-white">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-300">Memuat SmartBell Local...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
      {/* Toast Notification Floating */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium animate-bounce flex items-center space-x-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        schoolName={systemOverview?.schoolName || "SMP Negeri 1 SmartBell"}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          systemOverview={systemOverview}
          onQuickSoundTest={handleQuickSoundTest}
          isTestingSound={isTestingSound}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100/60 dark:bg-slate-950/60">
          {children}
        </main>
      </div>
    </div>
  );
}
