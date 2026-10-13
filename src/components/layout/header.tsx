"use client";

import React, { useEffect, useState } from "react";
import { Clock, Play, Radio, CheckCircle2, AlertTriangle, Moon, Sun } from "lucide-react";
import { Button } from "../ui/button";

interface HeaderProps {
  systemOverview?: {
    currentTime?: string;
    formattedDate?: string;
    isSchedulerRunning?: boolean;
    isPlayerOnline?: boolean;
    schedulerEnabled?: boolean;
  } | null;
  onQuickSoundTest?: () => void;
  isTestingSound?: boolean;
}

export function Header({ systemOverview, onQuickSoundTest, isTestingSound }: HeaderProps) {
  const [clientTime, setClientTime] = useState<string>("");
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClientTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const isSchedulerRunning = systemOverview?.isSchedulerRunning ?? true;
  const isPlayerOnline = systemOverview?.isPlayerOnline ?? false;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
      {/* Jam Digital & Tanggal */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 font-mono text-sm font-semibold tracking-wider">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>{clientTime || systemOverview?.currentTime || "--:--:--"}</span>
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
          {systemOverview?.formattedDate || "Memuat tanggal..."}
        </span>
      </div>

      {/* Status Badges & Quick Action */}
      <div className="flex items-center space-x-3">
        {/* Scheduler Status Pill */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isSchedulerRunning
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
          title={isSchedulerRunning ? "Scheduler aktif dan merespons" : "Scheduler berhenti atau offline"}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isSchedulerRunning ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className="hidden md:inline">Scheduler:</span>
          <span>{isSchedulerRunning ? "Aktif" : "Berhenti"}</span>
        </div>

        {/* Player Status Pill */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isPlayerOnline
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
          }`}
          title={isPlayerOnline ? "Halaman /player sedang terbuka" : "Halaman /player belum terbuka di komputer speaker"}
        >
          <Radio className={`h-3 w-3 ${isPlayerOnline ? "text-blue-600 animate-spin" : "text-amber-500"}`} />
          <span className="hidden md:inline">Player:</span>
          <span>{isPlayerOnline ? "Terhubung" : "Belum Siap"}</span>
        </div>

        {/* Tombol Cepat Tes Suara */}
        {onQuickSoundTest && (
          <Button
            size="sm"
            variant="warning"
            onClick={onQuickSoundTest}
            disabled={isTestingSound}
            className="shadow-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span className="hidden sm:inline">Tes Suara</span>
          </Button>
        )}

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          title="Ganti Tema Gelap/Terang"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
