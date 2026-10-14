"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  Calendar,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State Profil
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Form State Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setFullName(data.user.fullName || "");
        setUsername(data.user.username || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username }),
      });

      const json = await res.json();
      if (!res.ok) {
        setProfileError(json.error || "Gagal memperbarui profil.");
      } else {
        setProfile(json.user);
        setProfileSuccess("Profil berhasil diperbarui!");
        window.dispatchEvent(new Event("user-profile-updated"));
        setTimeout(() => setProfileSuccess(null), 4000);
      }
    } catch {
      setProfileError("Gagal menghubungi server.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password baru minimal 6 karakter.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setPasswordError(json.error || "Gagal mengubah password.");
      } else {
        setPasswordSuccess("Password berhasil diubah!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(null), 4000);
      }
    } catch {
      setPasswordError("Gagal menghubungi server.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Profil & Keamanan Akun
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola data diri, nama tampilan, username, serta perbarui kata sandi akun Anda
          </p>
        </div>

        {/* Ringkasan Akun */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-md shadow-blue-500/20">
              {profile?.fullName?.charAt(0) || profile?.username?.charAt(0) || "U"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {profile?.fullName || "Nama Pengguna"}
                </h2>
                <Badge variant={profile?.role === "ADMIN" ? "default" : "secondary"}>
                  {profile?.role === "ADMIN" ? "Administrator" : "Operator"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                @{profile?.username}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Terdaftar:{" "}
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form 1: Ubah Data Profil */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>Informasi Data Diri</span>
              </CardTitle>
              <CardDescription>
                Ubah nama lengkap dan username akun yang digunakan untuk login
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileSuccess && (
                  <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username login"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Digunakan saat masuk ke sistem SmartBell Local.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Peran / Hak Akses
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.role === "ADMIN" ? "Administrator Utama" : "Operator Sekolah"}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 py-2 px-3 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSavingProfile}
                    className="gap-2"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSavingProfile ? "Menyimpan..." : "Simpan Profil"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Form 2: Ubah Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <KeyRound className="h-4 w-4 text-amber-600" />
                <span>Ubah Kata Sandi</span>
              </CardTitle>
              <CardDescription>
                Perbarui kata sandi secara berkala demi keamanan akses komputer sekolah
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {passwordSuccess && (
                  <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password Saat Ini
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan password saat ini"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-3 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-3 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ulangi Password Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-3 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="warning"
                    size="sm"
                    disabled={isSavingPassword}
                    className="gap-2"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>{isSavingPassword ? "Memperbarui..." : "Perbarui Password"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
