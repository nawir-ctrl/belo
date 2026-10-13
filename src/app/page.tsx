"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Clock,
  Radio,
  Play,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Volume2,
  ExternalLink,
  Power,
  RotateCcw,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingScheduler, setIsTogglingScheduler] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/player/next-bell");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setCountdown(json.countdownSeconds || 0);
      }
    } catch (err) {
      console.error("Gagal mengambil data dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update countdown tiap detik
  useEffect(() => {
    const cd = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(cd);
  }, []);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "--:--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const toggleSchedulerMaster = async () => {
    if (!data) return;
    setIsTogglingScheduler(true);
    const newStatus = data.schedulerEnabled ? "false" : "true";
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SCHEDULER_ENABLED: newStatus }),
      });
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTogglingScheduler(false);
    }
  };

  const handleTestSound = async () => {
    try {
      await fetch("/api/player/test-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: 85, repeatCount: 1 }),
      });
      await fetchDashboardData();
    } catch {}
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Welcome & Master Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {data?.schoolName || "SMP Negeri 1 SmartBell"}
              </h1>
              <Badge variant={data?.schedulerEnabled ? "success" : "danger"}>
                {data?.schedulerEnabled ? "Sistem Aktif" : "Sistem Nonaktif"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {data?.formattedDate || "Memuat tanggal..."} • Zona Waktu: {data?.timezone || "Asia/Makassar"}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <Button
              variant={data?.schedulerEnabled ? "danger" : "success"}
              size="sm"
              onClick={toggleSchedulerMaster}
              disabled={isTogglingScheduler}
              className="gap-2"
            >
              <Power className="h-4 w-4" />
              <span>{data?.schedulerEnabled ? "Nonaktifkan Sistem" : "Aktifkan Sistem"}</span>
            </Button>

            <Button variant="warning" size="sm" onClick={handleTestSound} className="gap-2">
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Tes Suara</span>
            </Button>

            <Link href="/player" target="_blank">
              <Button variant="outline" size="sm" className="gap-2 border-emerald-500/50 text-emerald-700 dark:text-emerald-300">
                <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span>Buka Pemutar Bel</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Warning Alerts */}
        {(!data?.isPlayerOnline || !data?.isSchedulerRunning || data?.isHoliday) && (
          <div className="space-y-2">
            {!data?.isPlayerOnline && (
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Peringatan Halaman Pemutar:</strong> Halaman <code>/player</code> belum dibuka di komputer speaker. Bel tidak akan terdengar hingga halaman pemutar aktif.
                  </span>
                </div>
                <Link href="/player" target="_blank" className="font-bold underline text-amber-800 dark:text-amber-300 hover:text-amber-950 shrink-0 ml-4">
                  Buka /player sekarang →
                </Link>
              </div>
            )}

            {!data?.isSchedulerRunning && (
              <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs flex items-center space-x-2.5">
                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  <strong>Peringatan Scheduler:</strong> Background worker scheduler tidak mendeteksi detak jantung. Pastikan proses scheduler berjalan di terminal (<code>npm run scheduler</code>).
                </span>
              </div>
            )}

            {data?.isHoliday && (
              <div className="p-4 rounded-xl border border-blue-300 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-xs flex items-center space-x-2.5">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong>Informasi Libur Sekolah:</strong> Hari ini adalah hari libur <strong>({data.holidayName})</strong>. Seluruh bel otomatis dinonaktifkan untuk hari ini.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Jadwal Berikutnya</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate">
                {data?.nextSchedule ? data.nextSchedule.name : "Selesai Hari Ini"}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {data?.nextSchedule ? `Pukul ${data.nextSchedule.time}` : "Semua jadwal telah lewat"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Hitung Mundur</CardTitle>
              <Bell className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold font-mono text-emerald-600">
                {formatCountdown(countdown)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data?.nextSchedule ? "Menuju bel berbunyi" : "Istirahat jadwal"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Agenda Hari Ini</CardTitle>
              <Calendar className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.todaySchedulesCount ?? 0} Bel</div>
              <p className="text-xs text-slate-500 mt-1">
                Telah berbunyi: <strong className="text-emerald-600">{data?.playedCount ?? 0}</strong>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Status Audio & Speaker</CardTitle>
              <Radio className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    data?.isPlayerOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span className="text-sm font-bold">
                  {data?.isPlayerOnline ? "Speaker Terhubung" : "Menunggu Player"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {data?.isPlayerOnline ? "Siap memutar ke amplifier" : "Buka /player di browser"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 2 Kolom Konten: Agenda Hari Ini & Riwayat Eksekusi */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agenda Bel Hari Ini */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Agenda Hari Ini</CardTitle>
                  <CardDescription>Daftar urutan bel sepanjang hari ini</CardDescription>
                </div>
                <Link href="/schedules">
                  <Button variant="ghost" size="sm" className="text-xs text-blue-600">
                    Kelola Jadwal →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.todayAgenda && data.todayAgenda.length > 0 ? (
                data.todayAgenda.map((item: any) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      item.isPast
                        ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
                        : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-700/80 shadow-xs"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-500 capitalize">{item.bellType.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {item.time}
                      </span>
                      {item.isPast ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ada jadwal bel aktif untuk hari ini.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Riwayat Bel Terbaru */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Riwayat Bel Terbaru</CardTitle>
                  <CardDescription>Aktivitas pemutaran bel terkini (otomatis & manual)</CardDescription>
                </div>
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-xs text-blue-600">
                    Lihat Semua Riwayat →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="pb-2.5">Waktu</th>
                      <th className="pb-2.5">Nama Kegiatan</th>
                      <th className="pb-2.5">Tipe</th>
                      <th className="pb-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data?.recentExecutions && data.recentExecutions.length > 0 ? (
                      data.recentExecutions.map((exec: any) => (
                        <tr key={exec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">
                            {new Date(exec.scheduledFor).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                            {exec.bellName}
                          </td>
                          <td className="py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {exec.isManual ? "Manual" : "Otomatis"}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <Badge
                              variant={
                                exec.status === "PLAYED"
                                  ? "success"
                                  : exec.status === "TRIGGERED" || exec.status === "PLAYING"
                                  ? "default"
                                  : exec.status === "SKIPPED"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {exec.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                          Belum ada riwayat aktivitas bel hari ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
