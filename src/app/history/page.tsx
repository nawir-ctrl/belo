"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History as HistoryIcon,
  Search,
  Filter,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCcw,
} from "lucide-react";

export default function HistoryPage() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterManual, setFilterManual] = useState("");
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterDate) params.set("date", filterDate);
      if (filterStatus) params.set("status", filterStatus);
      if (filterManual) params.set("isManual", filterManual);
      params.set("limit", "50");

      const res = await fetch(`/api/history?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExecutions(json.executions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search, filterDate, filterStatus, filterManual]);

  const handleReplay = async (id: string) => {
    setReplayingId(id);
    try {
      const res = await fetch(`/api/history/${id}/replay`, { method: "POST" });
      if (res.ok) {
        alert("Sinyal putar ulang manual berhasil dikirim ke halaman player.");
        fetchHistory();
      } else {
        alert("Gagal memutar ulang bel.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setReplayingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLAYED":
        return <Badge variant="success">Berhasil Berbunyi</Badge>;
      case "PLAYING":
        return <Badge variant="default">Sedang Berbunyi</Badge>;
      case "TRIGGERED":
        return <Badge variant="default">Terpicu (Antrean)</Badge>;
      case "SKIPPED":
        return <Badge variant="warning">Dilewati</Badge>;
      case "FAILED":
        return <Badge variant="danger">Gagal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Riwayat Pemutaran Bel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Catatan log audit setiap eksekusi jadwal otomatis dan pemicu manual
          </p>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama bel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full md:w-44 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs focus:outline-none"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full md:w-40 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="PLAYED">Berhasil (PLAYED)</option>
              <option value="TRIGGERED">Terpicu (TRIGGERED)</option>
              <option value="PLAYING">Sedang Diputar</option>
              <option value="SKIPPED">Dilewati (SKIPPED)</option>
              <option value="FAILED">Gagal (FAILED)</option>
            </select>

            <select
              value={filterManual}
              onChange={(e) => setFilterManual(e.target.value)}
              className="w-full md:w-36 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs focus:outline-none"
            >
              <option value="">Otomatis & Manual</option>
              <option value="false">Otomatis Saja</option>
              <option value="true">Manual Saja</option>
            </select>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Waktu Jatuh Tempo</th>
                  <th className="py-3 px-4">Nama Kegiatan</th>
                  <th className="py-3 px-4">Tipe Pemicu</th>
                  <th className="py-3 px-4">Status & Keterangan</th>
                  <th className="py-3 px-4">Waktu Selesai</th>
                  <th className="py-3 px-4 text-right">Putar Ulang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {executions.length > 0 ? (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {new Date(exec.scheduledFor).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {exec.bellName}
                        </span>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {exec.bellType.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            exec.isManual
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {exec.isManual ? "Manual" : "Otomatis (Jadwal)"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-1">
                          <div>{getStatusBadge(exec.status)}</div>
                          {exec.errorMessage && (
                            <p className="text-[11px] text-rose-500 line-clamp-2">
                              {exec.errorMessage}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {exec.finishedAt
                          ? new Date(exec.finishedAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReplay(exec.id)}
                          disabled={replayingId === exec.id}
                          className="h-7 text-xs px-2 gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Replay</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      {isLoading ? "Memuat riwayat..." : "Tidak ada riwayat eksekusi."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
