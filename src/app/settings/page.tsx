"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Settings as SettingsIcon,
  Calendar,
  Layers,
  Archive,
  Download,
  Upload,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Shield,
} from "lucide-react";
import { SUPPORTED_TIMEZONES } from "@/lib/timezone";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "holidays" | "special" | "backup" | "autostart">("general");

  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // Holidays State
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayRecurring, setHolidayRecurring] = useState(false);

  // Special Periods State
  const [periods, setPeriods] = useState<any[]>([]);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodName, setPeriodName] = useState("");
  const [periodStartDate, setPeriodStartDate] = useState("");
  const [periodEndDate, setPeriodEndDate] = useState("");
  const [periodPriority, setPeriodPriority] = useState(10);

  // Backup & Restore State
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings || {});
      }
    } catch {}
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/holidays");
      if (res.ok) {
        const json = await res.json();
        setHolidays(json.holidays || []);
      }
    } catch {}
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetch("/api/special-periods");
      if (res.ok) {
        const json = await res.json();
        setPeriods(json.periods || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSettings();
    fetchHolidays();
    fetchPeriods();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSavedSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsSavedSuccess(true);
        setTimeout(() => setSettingsSavedSuccess(false), 3000);
      }
    } catch {
      alert("Gagal menyimpan pengaturan.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: holidayName,
          date: holidayDate,
          isRecurringYearly: holidayRecurring,
        }),
      });
      if (res.ok) {
        setIsHolidayModalOpen(false);
        setHolidayName("");
        setHolidayDate("");
        fetchHolidays();
      } else {
        const json = await res.json();
        alert(json.error || "Gagal menambah libur.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Hapus hari libur ini?")) return;
    try {
      await fetch(`/api/holidays/${id}`, { method: "DELETE" });
      fetchHolidays();
    } catch {}
  };

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/special-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: periodName,
          startDate: periodStartDate,
          endDate: periodEndDate,
          priority: Number(periodPriority),
          isActive: true,
        }),
      });
      if (res.ok) {
        setIsPeriodModalOpen(false);
        setPeriodName("");
        setPeriodStartDate("");
        setPeriodEndDate("");
        fetchPeriods();
      } else {
        const json = await res.json();
        alert(json.error || "Gagal menambah periode khusus.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("Hapus periode khusus ini?")) return;
    try {
      await fetch(`/api/special-periods/${id}`, { method: "DELETE" });
      fetchPeriods();
    } catch {}
  };

  const handleDownloadBackup = () => {
    window.location.href = "/api/backup/download";
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("PERINGATAN: Memulihkan backup akan menggantikan data jadwal dan pengaturan saat ini. Lanjutkan?")) {
      if (backupFileRef.current) backupFileRef.current.value = "";
      return;
    }

    setIsRestoring(true);
    setRestoreMessage("Sedang mengekstrak dan memulihkan file backup...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (res.ok) {
        setRestoreMessage("✅ Berhasil memulihkan database dan file audio! Muat ulang halaman.");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setRestoreMessage(`❌ Gagal restore: ${json.error}`);
      }
    } catch {
      setRestoreMessage("❌ Terjadi kesalahan saat memproses restore.");
    } finally {
      setIsRestoring(false);
      if (backupFileRef.current) backupFileRef.current.value = "";
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Pengaturan Sistem
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Konfigurasi identitas sekolah, kalender libur, jadwal periode khusus, backup, dan auto-start
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 overflow-x-auto pb-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-2 px-3.5 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === "general"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Pengaturan Umum</span>
          </button>
          <button
            onClick={() => setActiveTab("holidays")}
            className={`py-2 px-3.5 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === "holidays"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Kalender Libur ({holidays.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("special")}
            className={`py-2 px-3.5 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === "special"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Jadwal Khusus ({periods.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`py-2 px-3.5 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === "backup"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Backup & Restore</span>
          </button>
          <button
            onClick={() => setActiveTab("autostart")}
            className={`py-2 px-3.5 rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === "autostart"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Panduan Auto-Start</span>
          </button>
        </div>

        {/* Tab 1: General Settings */}
        {activeTab === "general" && (
          <Card>
            <CardHeader>
              <CardTitle>Identitas Sekolah & Scheduler</CardTitle>
              <CardDescription>Pengaturan operasional utama SmartBell Local</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl">
                {settingsSavedSuccess && (
                  <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Pengaturan berhasil disimpan!</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Sekolah
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.SCHOOL_NAME || ""}
                    onChange={(e) => setSettings({ ...settings, SCHOOL_NAME: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Zona Waktu Sekolah (Default: WITA)
                  </label>
                  <select
                    value={settings.TIMEZONE || "Asia/Makassar"}
                    onChange={(e) => setSettings({ ...settings, TIMEZONE: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {SUPPORTED_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Toleransi Catch-Up Terlewat (Menit)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.CATCHUP_MAX_MINUTES || "5"}
                      onChange={(e) => setSettings({ ...settings, CATCHUP_MAX_MINUTES: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Jika komputer mati dan hidup kembali, bel yang terlewat melebihi menit ini akan dilewati agar tidak memutar bel lama sekaligus.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Volume Pemutar Default (%)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={settings.DEFAULT_VOLUME || "85"}
                      onChange={(e) => setSettings({ ...settings, DEFAULT_VOLUME: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" disabled={isSavingSettings}>
                    {isSavingSettings ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Holidays */}
        {activeTab === "holidays" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Kalender Hari Libur Sekolah</CardTitle>
                <CardDescription>
                  Pada hari libur yang terdaftar, semua bel otomatis otomatis dinonaktifkan
                </CardDescription>
              </div>
              <Button variant="primary" size="sm" onClick={() => setIsHolidayModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Tambah Hari Libur</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Tanggal (YYYY-MM-DD)</th>
                    <th className="py-3 px-4">Nama Hari Libur</th>
                    <th className="py-3 px-4">Berulang Tiap Tahun</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {holidays.length > 0 ? (
                    holidays.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {h.date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {h.name}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={h.isRecurringYearly ? "success" : "secondary"}>
                            {h.isRecurringYearly ? "Ya (Tahunan)" : "Satu Kali"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada hari libur yang terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Special Periods */}
        {activeTab === "special" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Periode Jadwal Khusus</CardTitle>
                <CardDescription>
                  Atur periode seperti Bulan Ramadan, Ujian Sekolah, atau Upacara dengan prioritas lebih tinggi
                </CardDescription>
              </div>
              <Button variant="primary" size="sm" onClick={() => setIsPeriodModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Tambah Periode Khusus</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nama Periode</th>
                    <th className="py-3 px-4">Rentang Tanggal</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periods.length > 0 ? (
                    periods.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {p.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {p.startDate} s/d {p.endDate}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="default">Tingkat {p.priority}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeletePeriod(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada periode khusus yang diatur.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Backup & Restore */}
        {activeTab === "backup" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  <span>Buat & Unduh Cadangan (Backup)</span>
                </CardTitle>
                <CardDescription>
                  Menghasilkan arsip ZIP lengkap yang memuat database SQLite (jadwal, log, pengaturan) dan semua file audio MP3.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-500">
                  Simpan file backup secara berkala di flashdisk atau media penyimpanan luar untuk antisipasi kerusakan komputer sekolah.
                </p>
                <Button variant="primary" size="sm" onClick={handleDownloadBackup} className="gap-2">
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh Arsip Backup ZIP</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-amber-600" />
                  <span>Pulihkan Data (Restore)</span>
                </CardTitle>
                <CardDescription>
                  Memulihkan database SQLite dan folder audio dari file ZIP backup yang valid.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {restoreMessage && (
                  <div className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                    {restoreMessage}
                  </div>
                )}
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs">
                  <strong>Peringatan Penting:</strong> Proses restore akan menimpa seluruh database dan file audio yang ada saat ini.
                </div>
                <input
                  type="file"
                  ref={backupFileRef}
                  accept=".zip"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => backupFileRef.current?.click()}
                  disabled={isRestoring}
                  className="gap-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isRestoring ? "Memulihkan..." : "Pilih File ZIP & Pulihkan"}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 5: Panduan Auto-Start */}
        {activeTab === "autostart" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Terminal className="h-4 w-4 text-emerald-600" />
                  <span>Panduan Auto-Start Linux Debian / Ubuntu (systemd)</span>
                </CardTitle>
                <CardDescription>
                  Memastikan server SmartBell dan scheduler berjalan otomatis saat komputer dinyalakan dan otomatis restart jika terjadi error.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  1. Buat file systemd service di <code>/etc/systemd/system/smartbell.service</code>:
                </p>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
{`[Unit]
Description=SmartBell Local School Bell System
After=network.target

[Service]
Type=simple
User=administrator
WorkingDirectory=/home/administrator/smartbell
ExecStart=/usr/bin/node scripts/start-all.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target`}
                </pre>
                <p className="text-slate-600 dark:text-slate-300">
                  2. Aktifkan dan jalankan service:
                </p>
                <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px]">
{`sudo systemctl daemon-reload
sudo systemctl enable smartbell
sudo systemctl start smartbell`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Terminal className="h-4 w-4 text-blue-600" />
                  <span>Panduan Auto-Start Windows (Task Scheduler & Kiosk Mode)</span>
                </CardTitle>
                <CardDescription>
                  Menjalankan aplikasi dan membuka halaman pemutar <code>/player</code> secara otomatis saat Windows boot.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  1. Buat file batch <code>start-smartbell.bat</code> di folder proyek:
                </p>
                <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px]">
{`@echo off
cd /d "D:\\PROJECT\\BELO"
npm run start:all`}
                </pre>
                <p className="text-slate-600 dark:text-slate-300">
                  2. Buka <strong>Task Scheduler</strong> Windows &gt; Buat Task &gt; Trigger "At log on" &gt; Action jalankan file batch tersebut.
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  3. Untuk membuka halaman pemutar otomatis di layar monitor dalam mode layar penuh (Kiosk Mode):
                </p>
                <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px]">
{`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk http://127.0.0.1:3000/player --autoplay-policy=no-user-gesture-required`}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal Tambah Libur */}
        <Modal
          isOpen={isHolidayModalOpen}
          onClose={() => setIsHolidayModalOpen(false)}
          title="Tambah Hari Libur Baru"
          maxWidth="sm"
        >
          <form onSubmit={handleAddHoliday} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Hari Libur
              </label>
              <input
                type="text"
                required
                placeholder="Misal: Libur Semester Ganjil"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Libur
              </label>
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="recurring"
                checked={holidayRecurring}
                onChange={(e) => setHolidayRecurring(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="recurring" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Berulang setiap tahun (misal: 17 Agustus)
              </label>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsHolidayModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Simpan Libur
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Tambah Periode Khusus */}
        <Modal
          isOpen={isPeriodModalOpen}
          onClose={() => setIsPeriodModalOpen(false)}
          title="Tambah Periode Khusus Baru"
          maxWidth="sm"
        >
          <form onSubmit={handleAddPeriod} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Periode
              </label>
              <input
                type="text"
                required
                placeholder="Misal: Jadwal Khusus Bulan Ramadan"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  required
                  value={periodStartDate}
                  onChange={(e) => setPeriodStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  required
                  value={periodEndDate}
                  onChange={(e) => setPeriodEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tingkat Prioritas (Default: 10)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={periodPriority}
                onChange={(e) => setPeriodPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs font-mono"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPeriodModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Simpan Periode
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
