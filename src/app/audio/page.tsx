"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Upload,
  Play,
  Pause,
  Edit2,
  Trash2,
  Music,
  AlertTriangle,
  Volume2,
  HardDrive,
  Check,
} from "lucide-react";

export default function AudioPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Audio Preview Element
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Upload Form State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename State
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete State
  const [deletingAsset, setDeletingAsset] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAudioList = async () => {
    try {
      const res = await fetch("/api/audio");
      if (res.ok) {
        const json = await res.json();
        setAssets(json.assets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioList();
    const audio = new Audio();
    audio.onended = () => setPlayingId(null);
    audioPreviewRef.current = audio;

    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  const togglePreview = (assetId: string) => {
    if (!audioPreviewRef.current) return;

    if (playingId === assetId) {
      audioPreviewRef.current.pause();
      setPlayingId(null);
    } else {
      audioPreviewRef.current.src = `/api/audio/${assetId}/stream`;
      audioPreviewRef.current.play().then(() => {
        setPlayingId(assetId);
      }).catch((err) => {
        alert("Gagal memutar pratinjau audio: " + err.message);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("displayName", uploadName);

    try {
      const res = await fetch("/api/audio", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.error || "Gagal mengunggah file audio.");
      } else {
        setSelectedFile(null);
        setUploadName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchAudioList();
      }
    } catch {
      setUploadError("Gagal menghubungi server.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !renameValue.trim()) return;

    try {
      const res = await fetch(`/api/audio/${editingAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        setEditingAsset(null);
        fetchAudioList();
      }
    } catch {}
  };

  const handleDelete = async (force: boolean = false) => {
    if (!deletingAsset) return;
    setDeleteError(null);

    try {
      const res = await fetch(`/api/audio/${deletingAsset.id}?force=${force}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok) {
        setDeleteError(
          json.error +
            (json.inUseSchedules
              ? ` (Digunakan oleh: ${json.inUseSchedules.join(", ")})`
              : "")
        );
      } else {
        setDeletingAsset(null);
        fetchAudioList();
      }
    } catch {
      setDeleteError("Gagal menghapus file.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Manajemen Audio MP3
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unggah, pratinjau nada dering, dan kelola file MP3/WAV persisten di komputer lokal
          </p>
        </div>

        {/* Upload Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Unggah File Audio Baru</span>
            </CardTitle>
            <CardDescription>
              Format yang didukung: MP3, WAV, OGG. Ukuran maksimum: 50MB per file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              {uploadError && (
                <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih File Audio
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    required
                    accept=".mp3,.wav,.ogg,audio/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Tampilan Audio
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Nada Masuk Sekolah 2026"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!selectedFile || isUploading}
                  className="gap-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isUploading ? "Mengunggah..." : "Simpan Audio"}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Audio Assets List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-slate-600" />
              <span>Daftar File Audio Tersimpan ({assets.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Putar</th>
                  <th className="py-3 px-4">Nama Tampilan</th>
                  <th className="py-3 px-4">Nama File Asli</th>
                  <th className="py-3 px-4">Ukuran</th>
                  <th className="py-3 px-4">Penggunaan Jadwal</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.length > 0 ? (
                  assets.map((asset) => {
                    const isCurrentPlaying = playingId === asset.id;
                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => togglePreview(asset.id)}
                            className={`p-2 rounded-full transition-colors ${
                              isCurrentPlaying
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 animate-pulse"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            }`}
                            title={isCurrentPlaying ? "Hentikan pratinjau" : "Putar pratinjau"}
                          >
                            {isCurrentPlaying ? (
                              <Pause className="h-3.5 w-3.5 fill-current" />
                            ) : (
                              <Play className="h-3.5 w-3.5 fill-current" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {asset.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[180px]">
                          {asset.originalFileName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {formatFileSize(asset.fileSize)}
                        </td>
                        <td className="py-3 px-4">
                          {asset.inUse ? (
                            <div className="flex items-center space-x-1">
                              <Badge variant="success">Digunakan</Badge>
                              <span className="text-[10px] text-slate-400">
                                ({asset.schedules?.length || 0} jadwal)
                              </span>
                            </div>
                          ) : (
                            <Badge variant="secondary">Tidak Digunakan</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setEditingAsset(asset);
                                setRenameValue(asset.name);
                              }}
                              title="Ganti Nama"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingAsset(asset);
                                setDeleteError(null);
                              }}
                              title="Hapus File"
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
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      {isLoading ? "Memuat audio..." : "Belum ada file audio yang tersimpan."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Modal Ganti Nama */}
        <Modal
          isOpen={!!editingAsset}
          onClose={() => setEditingAsset(null)}
          title="Ganti Nama Audio"
          maxWidth="sm"
        >
          <form onSubmit={handleRename} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Tampilan Baru
              </label>
              <input
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingAsset(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Simpan Nama
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Hapus Audio */}
        <Modal
          isOpen={!!deletingAsset}
          onClose={() => setDeletingAsset(null)}
          title="Konfirmasi Hapus File Audio"
          maxWidth="sm"
        >
          <div className="space-y-4">
            {deleteError ? (
              <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs">
                <p className="font-semibold mb-1">Peringatan Ketergantungan:</p>
                <p>{deleteError}</p>
                <div className="mt-3 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setDeletingAsset(null)}>
                    Batal
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(true)}>
                    Tetap Hapus Paksa
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Apakah Anda yakin ingin menghapus file <strong>{deletingAsset?.name}</strong>?
                </p>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setDeletingAsset(null)}>
                    Batal
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(false)}>
                    Hapus File
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
