"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Plus,
  Search,
  Filter,
  Copy,
  Edit,
  Trash2,
  Download,
  Upload,
  Check,
  Power,
  Volume2,
  Calendar,
  AlertTriangle,
  Youtube,
  Loader2,
} from "lucide-react";
import { BELL_TYPES } from "@/lib/validations/schedule";
import { DAYS_OF_WEEK_NAMES } from "@/lib/timezone";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [audioAssets, setAudioAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formTime, setFormTime] = useState("07:00");
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formType, setFormType] = useState("MASUK");
  const [formAudioId, setFormAudioId] = useState("");
  const [formVolume, setFormVolume] = useState(85);
  const [formRepeatCount, setFormRepeatCount] = useState(1);
  const [formRepeatInterval, setFormRepeatInterval] = useState(2);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // CSV Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick YouTube Import State
  const [isYtModalOpen, setIsYtModalOpen] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytName, setYtName] = useState("");
  const [isCheckingYt, setIsCheckingYt] = useState(false);
  const [isDownloadingYt, setIsDownloadingYt] = useState(false);
  const [ytInfo, setYtInfo] = useState<any | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedDay) params.set("day", selectedDay);
      if (selectedType) params.set("bellType", selectedType);
      if (selectedStatus) params.set("isActive", selectedStatus);

      const res = await fetch(`/api/schedules?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setSchedules(json.schedules || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAudioList = async () => {
    try {
      const res = await fetch("/api/audio");
      if (res.ok) {
        const json = await res.json();
        setAudioAssets(json.assets || []);
        if (json.assets?.length > 0 && !formAudioId) {
          setFormAudioId(json.assets[0].id);
        }
      }
    } catch {}
  };

  const handleCheckYtQuick = async () => {
    if (!ytUrl.trim()) return;
    setYtError(null);
    setIsCheckingYt(true);
    try {
      const res = await fetch("/api/audio/youtube/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setYtError(json.error || "Gagal memeriksa video YouTube.");
      } else {
        setYtInfo(json.info);
        if (!ytName) setYtName(json.info.title || "");
      }
    } catch {
      setYtError("Gagal menghubungi server.");
    } finally {
      setIsCheckingYt(false);
    }
  };

  const handleDownloadYtQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;
    setYtError(null);
    setIsDownloadingYt(true);
    try {
      const res = await fetch("/api/audio/youtube/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: ytUrl.trim(),
          displayName: ytName.trim() || ytInfo?.title || "",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setYtError(json.error || "Gagal mengunduh audio YouTube.");
      } else {
        await fetchAudioList();
        if (json.asset?.id) {
          setFormAudioId(json.asset.id);
        }
        setIsYtModalOpen(false);
        setYtUrl("");
        setYtName("");
        setYtInfo(null);
      }
    } catch {
      setYtError("Gagal mengunduh audio dari YouTube.");
    } finally {
      setIsDownloadingYt(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchAudioList();
  }, [search, selectedDay, selectedType, selectedStatus]);

  const openAddModal = () => {
    setEditingSchedule(null);
    setFormName("");
    setFormTime("07:00");
    setFormDays([1, 2, 3, 4, 5]);
    setFormType("MASUK");
    setFormAudioId(audioAssets[0]?.id || "");
    setFormVolume(85);
    setFormRepeatCount(1);
    setFormRepeatInterval(2);
    setFormIsActive(true);
    setFormStartDate("");
    setFormEndDate("");
    setFormNotes("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sched: any) => {
    setEditingSchedule(sched);
    setFormName(sched.name);
    setFormTime(sched.time);
    try {
      setFormDays(JSON.parse(sched.daysOfWeek));
    } catch {
      setFormDays([1, 2, 3, 4, 5]);
    }
    setFormType(sched.bellType);
    setFormAudioId(sched.audioAssetId || audioAssets[0]?.id || "");
    setFormVolume(sched.volume);
    setFormRepeatCount(sched.repeatCount);
    setFormRepeatInterval(sched.repeatIntervalSec);
    setFormIsActive(sched.isActive);
    setFormStartDate(sched.startDate || "");
    setFormEndDate(sched.endDate || "");
    setFormNotes(sched.notes || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const toggleDay = (dayId: number) => {
    if (formDays.includes(dayId)) {
      if (formDays.length > 1) {
        setFormDays(formDays.filter((d) => d !== dayId));
      }
    } else {
      setFormDays([...formDays, dayId].sort());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    const payload = {
      name: formName.trim(),
      time: formTime,
      daysOfWeek: formDays,
      bellType: formType,
      audioAssetId: formAudioId || null,
      volume: formVolume,
      repeatCount: formRepeatCount,
      repeatIntervalSec: formRepeatInterval,
      isActive: formIsActive,
      startDate: formStartDate || null,
      endDate: formEndDate || null,
      notes: formNotes.trim() || null,
    };

    try {
      const url = editingSchedule ? `/api/schedules/${editingSchedule.id}` : "/api/schedules";
      const method = editingSchedule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Gagal menyimpan jadwal.");
      } else {
        setIsModalOpen(false);
        fetchSchedules();
      }
    } catch {
      setFormError("Gagal menghubungi server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}/toggle`, { method: "PATCH" });
      fetchSchedules();
    } catch {}
  };

  const handleDuplicate = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}/duplicate`, { method: "POST" });
      fetchSchedules();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      setDeletingId(null);
      fetchSchedules();
    } catch {}
  };

  const handleExportCsv = () => {
    window.location.href = "/api/schedules/export";
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/schedules/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        alert(`Berhasil mengimpor ${json.count} jadwal sekolah.`);
        fetchSchedules();
      } else {
        alert(`Gagal impor: ${json.error}`);
      }
    } catch {
      alert("Gagal mengunggah file CSV.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Manajemen Jadwal Bel
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Atur waktu berdering, hari aktif, jenis bel, dan nada lonceng sekolah
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportCsv}
              accept=".csv"
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Impor CSV</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor CSV</span>
            </Button>

            <Button variant="primary" size="sm" onClick={openAddModal} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Tambah Jadwal</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama kegiatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-4 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full md:w-36 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs focus:outline-none"
            >
              <option value="">Semua Hari</option>
              {DAYS_OF_WEEK_NAMES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full md:w-44 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs focus:outline-none"
            >
              <option value="">Semua Jenis Bel</option>
              {BELL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full md:w-36 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </CardContent>
        </Card>

        {/* Schedules Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">Status</th>
                  <th className="py-3.5 px-4">Jam</th>
                  <th className="py-3.5 px-4">Nama Kegiatan</th>
                  <th className="py-3.5 px-4">Hari Aktif</th>
                  <th className="py-3.5 px-4">Jenis Bel</th>
                  <th className="py-3.5 px-4">Audio & Volume</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {schedules.length > 0 ? (
                  schedules.map((sched) => {
                    let activeDays: number[] = [];
                    try {
                      activeDays = JSON.parse(sched.daysOfWeek);
                    } catch {
                      activeDays = [];
                    }

                    return (
                      <tr
                        key={sched.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          !sched.isActive ? "opacity-60 bg-slate-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggle(sched.id)}
                            title={sched.isActive ? "Nonaktifkan jadwal" : "Aktifkan jadwal"}
                            className={`p-1 rounded-md transition-colors ${
                              sched.isActive
                                ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sm text-blue-900 dark:text-blue-400">
                          {sched.time}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {sched.name}
                          </div>
                          {sched.notes && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {sched.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            {DAYS_OF_WEEK_NAMES.map((d) => (
                              <span
                                key={d.id}
                                className={`h-5 w-5 text-[10px] rounded flex items-center justify-center font-bold ${
                                  activeDays.includes(d.id)
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                                }`}
                              >
                                {d.short[0]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">
                            {BELL_TYPES.find((t) => t.value === sched.bellType)?.label || sched.bellType}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                            {sched.audioAsset?.sourceType === "YOUTUBE" ? (
                              <Youtube className="h-3.5 w-3.5 text-red-600 shrink-0 fill-current" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[120px]">
                              {sched.audioAsset?.name || "Lonceng Bawaan"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({sched.volume}%)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleDuplicate(sched.id)}
                              title="Duplikasi Jadwal"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(sched)}
                              title="Edit Jadwal"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(sched.id)}
                              title="Hapus Jadwal"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      {isLoading ? "Memuat jadwal..." : "Tidak ada jadwal yang sesuai filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Modal Form Tambah / Edit */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingSchedule ? "Edit Jadwal Bel" : "Tambah Jadwal Bel Baru"}
          maxWidth="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Kegiatan
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Misal: Bel Masuk Sekolah, Bel Istirahat"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jam Bunyi (24 Jam)
                </label>
                <input
                  type="time"
                  required
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Bel
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {BELL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hari Aktif Checkbox */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Hari Aktif Berdering
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK_NAMES.map((d) => {
                  const isChecked = formDays.includes(d.id);
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => toggleDay(d.id)}
                      className={`py-2 text-center rounded-lg border text-xs font-semibold transition-all ${
                        isChecked
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Audio MP3 & Volume */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    File Audio Lonceng
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setYtError(null);
                      setYtInfo(null);
                      setYtUrl("");
                      setYtName("");
                      setIsYtModalOpen(true);
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Youtube className="h-3 w-3 fill-current" />
                    <span>+ Dari YouTube</span>
                  </button>
                </div>
                <select
                  value={formAudioId}
                  onChange={(e) => setFormAudioId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {audioAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.sourceType === "YOUTUBE" ? `[YouTube] ${a.name}` : a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Volume ({formVolume}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formVolume}
                  onChange={(e) => setFormVolume(Number(e.target.value))}
                  className="w-full h-2 mt-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Pengulangan (Repeat Count & Interval) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Pengulangan
                </label>
                <select
                  value={formRepeatCount}
                  onChange={(e) => setFormRepeatCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs"
                >
                  <option value={1}>1 Kali</option>
                  <option value={2}>2 Kali</option>
                  <option value={3}>3 Kali</option>
                  <option value={4}>4 Kali</option>
                  <option value={5}>5 Kali</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jeda Antar-Ulang (Detik)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formRepeatInterval}
                  onChange={(e) => setFormRepeatInterval(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Keterangan khusus untuk operator..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Aktifkan jadwal ini secara langsung
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Konfirmasi Hapus */}
        <Modal
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          title="Konfirmasi Hapus Jadwal"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deletingId && handleDelete(deletingId)}
              >
                Hapus Jadwal
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Quick Import YouTube */}
        <Modal
          isOpen={isYtModalOpen}
          onClose={() => setIsYtModalOpen(false)}
          title="Impor Audio dari Link YouTube"
          maxWidth="md"
        >
          <form onSubmit={handleDownloadYtQuick} className="space-y-4">
            {ytError && (
              <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{ytError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Link YouTube
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={ytUrl}
                    onChange={(e) => {
                      setYtUrl(e.target.value);
                      setYtInfo(null);
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <Youtube className="h-4 w-4 text-red-500 absolute left-2.5 top-2.5" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckYtQuick}
                  disabled={!ytUrl.trim() || isCheckingYt || isDownloadingYt}
                  className="text-xs shrink-0 gap-1"
                >
                  {isCheckingYt ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  <span>{isCheckingYt ? "Cek..." : "Cek Video"}</span>
                </Button>
              </div>
            </div>

            {ytInfo && (
              <div className="p-3 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-3">
                {ytInfo.thumbnailUrl && (
                  <img
                    src={ytInfo.thumbnailUrl}
                    alt="Thumbnail"
                    className="w-16 h-10 object-cover rounded border border-red-200"
                  />
                )}
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {ytInfo.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Durasi: {ytInfo.durationFormatted}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Tampilan Audio
              </label>
              <input
                type="text"
                placeholder="Judul otomatis atau nama kustom"
                value={ytName}
                onChange={(e) => setYtName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsYtModalOpen(false)}
                disabled={isDownloadingYt}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!ytUrl.trim() || isDownloadingYt || isCheckingYt}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDownloadingYt ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Mengunduh Audio...</span>
                  </>
                ) : (
                  <>
                    <Youtube className="h-3.5 w-3.5 fill-current" />
                    <span>Unduh & Pilih untuk Jadwal</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
