"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Server,
  Database,
  Radio,
  Clock,
  HardDrive,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/diagnostics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 6000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0 detik";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d} hari, ${h} jam, ${m} menit`;
    if (h > 0) return `${h} jam, ${m} menit, ${s} detik`;
    return `${m} menit, ${s} detik`;
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Diagnostik Sistem & Kesehatan Server
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pemantauan real-time proses backend, status database SQLite, dan koneksi speaker lokal
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDiagnostics}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Segarkan Status</span>
          </Button>
        </div>

        {!data ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Memuat data diagnostik sistem...</p>
          </div>
        ) : (
          <>
            {/* 4 Diagnostic Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Scheduler Heartbeat */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                    Detak Scheduler
                  </CardTitle>
                  <Activity className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        data.scheduler?.isRunning ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                      }`}
                    />
                    <span className="text-base font-bold">
                      {data.scheduler?.isRunning ? "Aktif & Merespons" : "Berhenti / Timeout"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Detak terakhir:{" "}
                    {data.scheduler?.heartbeatDiffSeconds != null
                      ? `${data.scheduler.heartbeatDiffSeconds} detik lalu`
                      : "Belum ada"}
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: Player Status */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                    Status Pemutar /player
                  </CardTitle>
                  <Radio className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        data.player?.isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    <span className="text-base font-bold">
                      {data.player?.isOnline ? "Browser Terhubung" : "Offline / Belum Dibuka"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Polling terakhir:{" "}
                    {data.player?.lastSeenDiffSeconds != null
                      ? `${data.player.lastSeenDiffSeconds} detik lalu`
                      : "Belum ada"}
                  </p>
                </CardContent>
              </Card>

              {/* Card 3: SQLite Database */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                    Database SQLite
                  </CardTitle>
                  <Database className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {data.database?.status === "OK" ? "Terhubung (Normal)" : "Bermasalah"}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Ukuran file: {formatBytes(data.database?.sizeBytes)}
                  </p>
                </CardContent>
              </Card>

              {/* Card 4: Audio Files Storage */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                    Penyimpanan Audio
                  </CardTitle>
                  <HardDrive className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-base font-bold">
                    {data.audioStorage?.filesCount || 0} File Audio
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Total size: {formatBytes(data.audioStorage?.totalSizeBytes)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Diagnostics Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Waktu & Lokalisasi */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>Waktu Sistem & Zona Waktu</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-slate-500">Waktu Terformat:</dt>
                      <dd className="font-semibold">{data.systemTime?.formatted || "-"}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-slate-500">Jam Digital:</dt>
                      <dd className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {data.systemTime?.time || "-"}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-slate-500">Zona Waktu Aktif:</dt>
                      <dd className="font-mono">{data.systemTime?.timezone || "-"}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-slate-500">ISO Timestamp:</dt>
                      <dd className="font-mono text-[11px] text-slate-500">{data.systemTime?.iso || "-"}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Statistik Komputer & Node.js */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Server className="h-4 w-4 text-emerald-600" />
                    <span>Lingkungan Komputer Server</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-slate-500">Sistem Operasi:</dt>
                      <dd className="font-semibold">{data.system?.os || "-"}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-slate-500">Versi Node.js:</dt>
                      <dd className="font-mono">{data.system?.nodeVersion || "-"}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-slate-500">Uptime Proses:</dt>
                      <dd>{formatUptime(data.system?.uptimeSeconds)}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-slate-500">Memori Heap Digunakan:</dt>
                      <dd className="font-mono">{data.system?.memoryUsageMb || 0} MB</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
