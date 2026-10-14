"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  Sparkles,
  RefreshCw,
  Calendar,
} from "lucide-react";

interface BellEvent {
  id: string;
  bellName: string;
  bellType: string;
  volume: number;
  repeatCount: number;
  repeatIntervalSec: number;
  scheduledFor: string;
  audioAsset: {
    id: string;
    name: string;
    storedFileName: string;
    mimeType: string;
  } | null;
  audioAssets?: Array<{
    id: string;
    name: string;
    storedFileName: string;
    mimeType: string;
  }>;
}

export default function PlayerPage() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingTitle, setCurrentPlayingTitle] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(85);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clientTime, setClientTime] = useState("");
  const [clientDate, setClientDate] = useState("");
  const [schoolName, setSchoolName] = useState("SMP Negeri 1 SmartBell");
  const [nextSchedule, setNextSchedule] = useState<any>(null);
  const [countdownSec, setCountdownSec] = useState<number>(0);
  const [nextUpcomingSchedule, setNextUpcomingSchedule] = useState<any>(null);
  const [nextUpcomingCountdownSec, setNextUpcomingCountdownSec] = useState<number>(0);
  const [todayAgenda, setTodayAgenda] = useState<any[]>([]);
  const [showAgenda, setShowAgenda] = useState(false);
  const [autoplayError, setAutoplayError] = useState<string | null>(null);

  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const eventQueueRef = useRef<BellEvent[]>([]);

  // 1. Inisialisasi Audio Element & Polling Waktu Realtime
  useEffect(() => {
    // Muat processed IDs dari sessionStorage agar reload tidak memutar ulang
    try {
      const stored = sessionStorage.getItem("smartbell_processed_events");
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          processedEventIdsRef.current = new Set(ids);
        }
      }
    } catch {}

    const audio = new Audio();
    audio.preload = "auto";
    audioElementRef.current = audio;

    const updateClock = () => {
      const now = new Date();
      setClientTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setClientDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };

    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    return () => {
      clearInterval(clockInterval);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  // Simpan processed IDs ke session storage
  const markEventProcessed = (id: string) => {
    processedEventIdsRef.current.add(id);
    try {
      sessionStorage.setItem(
        "smartbell_processed_events",
        JSON.stringify(Array.from(processedEventIdsRef.current).slice(-200))
      );
    } catch {}
  };

  // 2. Buka Akses Audio Browser (Unlock Autoplay)
  const unlockAudio = async () => {
    try {
      // Buat & mainkan synthetic silent buffer dengan Web Audio API
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
      }

      // Mainkan silent audio pada HTMLAudioElement
      if (audioElementRef.current) {
        audioElementRef.current.src =
          "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        await audioElementRef.current.play();
      }

      setAudioUnlocked(true);
      setAutoplayError(null);
      return true;
    } catch (err: any) {
      console.warn("Audio unlock belum diizinkan tanpa interaksi:", err);
      return false;
    }
  };

  // Coba otomatis unlock audio saat halaman dimuat atau pada interaksi user pertama
  useEffect(() => {
    // 1. Coba aktifkan langsung (berhasil jika flag autoplay aktif atau diizinkan di browser)
    unlockAudio();

    // 2. Fallback: jika browser masih menahan, aktifkan otomatis pada interaksi/klik pertama apapun di layar
    const handleFirstInteraction = () => {
      unlockAudio();
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // 3. Putar satu event dengan pengulangan (Repeat Count)
  const playEventAudio = async (event: BellEvent) => {
    if (!audioElementRef.current) return;
    isPlayingRef.current = true;
    setIsPlaying(true);

    // Siapkan playlist urutan suara (mendukung multi-audio)
    const playlist =
      event.audioAssets && event.audioAssets.length > 0
        ? event.audioAssets
        : event.audioAsset
        ? [event.audioAsset]
        : [];

    if (playlist.length === 0) {
      // Audio tidak valid
      try {
        await fetch(`/api/player/events/${event.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "FAILED", errorMessage: "File audio tidak tersedia di server." }),
        });
      } catch {}
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentPlayingTitle(null);
      processNextQueue();
      return;
    }

    // Kirim notifikasi status PLAYING ke server
    try {
      await fetch(`/api/player/events/${event.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PLAYING" }),
      });
    } catch {}

    const audio = audioElementRef.current;
    audio.volume = Math.max(0, Math.min(1, (event.volume ?? volume) / 100));

    let currentRepeat = 0;
    const maxRepeats = Math.max(1, event.repeatCount || 1);
    const repeatInterval = Math.max(1, (event.repeatIntervalSec || 2) * 1000);
    let currentTrackIndex = 0;

    const playCurrentTrack = () => {
      const track = playlist[currentTrackIndex];
      if (!track || !track.id) {
        advanceTrack();
        return;
      }

      if (playlist.length > 1) {
        setCurrentPlayingTitle(
          `${event.bellName} (${currentTrackIndex + 1}/${playlist.length}: ${track.name})`
        );
      } else {
        setCurrentPlayingTitle(event.bellName);
      }

      audio.src = `/api/audio/${track.id}/stream`;
      audio
        .play()
        .then(() => {
          setAudioUnlocked(true);
          setAutoplayError(null);
        })
        .catch(async (err) => {
          console.error("Autoplay ditolak oleh browser:", err);
          setAutoplayError(
            "Browser menolak pemutaran otomatis. Klik tombol 'Aktifkan Audio' di layar."
          );
          try {
            await fetch(`/api/player/events/${event.id}/status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "FAILED",
                errorMessage: `Autoplay browser ditolak: ${err.message}`,
              }),
            });
          } catch {}
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentPlayingTitle(null);
          processNextQueue();
        });
    };

    const advanceTrack = () => {
      currentTrackIndex++;
      if (currentTrackIndex < playlist.length) {
        // Mainkan suara berikutnya dalam urutan dengan jeda halus (400ms)
        setTimeout(playCurrentTrack, 400);
      } else {
        // Seluruh urutan suara dalam satu siklus selesai diputar
        currentRepeat++;
        if (currentRepeat < maxRepeats) {
          currentTrackIndex = 0;
          setTimeout(playCurrentTrack, repeatInterval);
        } else {
          // Selesai seluruh pengulangan! Laporkan status PLAYED
          try {
            fetch(`/api/player/events/${event.id}/status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "PLAYED" }),
            }).catch(() => {});
          } catch {}
          isPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentPlayingTitle(null);
          processNextQueue();
        }
      }
    };

    audio.onended = () => {
      advanceTrack();
    };

    audio.onerror = () => {
      console.error(`Kesalahan memuat file audio track ke-${currentTrackIndex + 1}`);
      // Jika salah satu track bermasalah, lanjutkan ke track berikutnya dalam urutan
      advanceTrack();
    };

    playCurrentTrack();
  };

  const processNextQueue = () => {
    if (isPlayingRef.current) return;
    if (eventQueueRef.current.length > 0) {
      const nextEvent = eventQueueRef.current.shift()!;
      playEventAudio(nextEvent);
    }
  };

  // 4. Polling antrean event dan info jadwal berikutnya (setiap 2.5 detik)
  useEffect(() => {
    const pollEvents = async () => {
      try {
        // A. Ambil event baru
        const res = await fetch("/api/player/events/poll");
        if (res.ok) {
          const data = await res.json();
          const incomingEvents: BellEvent[] = data.events || [];

          for (const ev of incomingEvents) {
            if (!processedEventIdsRef.current.has(ev.id)) {
              markEventProcessed(ev.id);
              if (!isPlayingRef.current && eventQueueRef.current.length === 0) {
                playEventAudio(ev);
              } else {
                eventQueueRef.current.push(ev);
              }
            }
          }
        }

        // B. Ambil jadwal berikutnya & nama sekolah
        const bellRes = await fetch("/api/player/next-bell");
        if (bellRes.ok) {
          const bellData = await bellRes.json();
          if (bellData.schoolName) setSchoolName(bellData.schoolName);
          setNextSchedule(bellData.nextSchedule);
          setCountdownSec(bellData.countdownSeconds || 0);
          setNextUpcomingSchedule(bellData.nextUpcomingSchedule || null);
          setNextUpcomingCountdownSec(bellData.nextUpcomingCountdownSec || 0);
          setTodayAgenda(bellData.todayAgenda || []);
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    };

    pollEvents();
    const pollInterval = setInterval(pollEvents, 2500);
    return () => clearInterval(pollInterval);
  }, []);

  // Update countdown per detik
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
      setNextUpcomingCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdownTimer);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const triggerTestSound = async () => {
    try {
      await fetch("/api/player/test-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume }),
      });
    } catch {}
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-10 select-none overflow-hidden font-sans">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Volume2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
              {schoolName}
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Pemutar Suara Bel Sekolah (Terhubung ke Amplifier)
            </p>
          </div>
        </div>

        {/* Audio Status Pill & Fullscreen */}
        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              audioUnlocked
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                : "bg-amber-950/60 text-amber-300 border-amber-800 animate-pulse"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                audioUnlocked ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span>{audioUnlocked ? "Audio Siap Diputar" : "Audio Belum Diaktifkan"}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Layar Penuh (Kiosk Mode)"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Warning Autoplay if not unlocked */}
      {!audioUnlocked && (
        <div className="my-4 rounded-xl border border-amber-600/60 bg-amber-950/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-950/30">
          <div className="flex items-center space-x-3 text-amber-200 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <span>
              Kebijakan browser mewajibkan klik interaktif agar suara bel dapat berbunyi otomatis.
            </span>
          </div>
          <button
            onClick={unlockAudio}
            className="whitespace-nowrap rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-sm shadow-md transition-colors"
          >
            Aktifkan Audio Sekarang
          </button>
        </div>
      )}

      {/* Main Center Display: Digital Clock & Active Bell Animation */}
      <div className="my-auto flex flex-col items-center justify-center text-center py-6">
        {/* Indikator Ketika Bel Berbunyi */}
        {isPlaying ? (
          <div className="mb-6 flex flex-col items-center animate-bounce">
            <div className="h-28 w-28 rounded-full bg-blue-600/20 border-4 border-blue-500 flex items-center justify-center shadow-2xl shadow-blue-500/50">
              <Volume2 className="h-16 w-16 text-blue-400 animate-pulse" />
            </div>
            <div className="mt-4 inline-flex items-center space-x-2 bg-blue-900/60 border border-blue-700 px-4 py-2 rounded-full text-blue-200 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-blue-400 animate-spin" />
              <span>SEDANG BERBUNYI: {currentPlayingTitle || "Bel Sekolah"}</span>
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <span className="text-xs uppercase tracking-widest font-mono text-slate-400 font-semibold">
              WAKTU LOKAL SEKOLAH
            </span>
          </div>
        )}

        {/* Jam Digital Raksasa */}
        <div className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tight font-mono text-white drop-shadow-md">
          {clientTime || "--:--:--"}
        </div>

        {/* Tanggal Hari Ini */}
        <p className="text-base md:text-xl font-medium text-slate-400 mt-2">
          {clientDate || "Memuat tanggal..."}
        </p>

        {/* Kartu Jadwal Berikutnya & Hitung Mundur */}
        <div className="mt-8 w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-xl">
          {nextSchedule ? (
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                  Jadwal Bel Berikutnya (Hari Ini)
                </span>
                <h2 className="text-lg md:text-xl font-bold text-white mt-0.5">
                  {nextSchedule.name}
                </h2>
                <p className="text-xs text-blue-400 font-mono mt-0.5">
                  Pukul {nextSchedule.time}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Hitung Mundur
                </span>
                <span className="text-2xl md:text-3xl font-extrabold font-mono text-emerald-400">
                  {formatCountdown(countdownSec)}
                </span>
              </div>
            </div>
          ) : nextUpcomingSchedule ? (
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  Jadwal Hari Ini Telah Selesai
                </span>
                <h2 className="text-lg md:text-xl font-bold text-white mt-0.5">
                  {nextUpcomingSchedule.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {nextUpcomingSchedule.dayLabel} • Pukul {nextUpcomingSchedule.time}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Hitung Mundur
                </span>
                <span className="text-xl md:text-2xl font-extrabold font-mono text-amber-300">
                  {formatCountdown(nextUpcomingCountdownSec)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Status Jadwal
              </span>
              <p className="text-base font-semibold text-slate-300 mt-1">
                Tidak ada jadwal bel aktif hari ini
              </p>
            </div>
          )}
        </div>

        {/* Toggle & Daftar Agenda Bel Hari Ini */}
        {todayAgenda.length > 0 && (
          <div className="mt-4 w-full max-w-xl">
            <button
              onClick={() => setShowAgenda(!showAgenda)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5 mx-auto py-1.5 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span>
                {showAgenda
                  ? "Sembunyikan Agenda Hari Ini"
                  : `Lihat Agenda Hari Ini (${todayAgenda.length} Jadwal)`}
              </span>
            </button>

            {showAgenda && (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3 max-h-56 overflow-y-auto backdrop-blur text-left space-y-1.5 shadow-2xl">
                {todayAgenda.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                      item.status === "SEDANG_BERBUNYI" || item.status === "SEDANG_DIPICU"
                        ? "bg-blue-950/80 border border-blue-600 text-blue-200 animate-pulse"
                        : item.status === "SUDAH_BERBUNYI"
                        ? "bg-slate-950/40 border border-slate-800/80 text-slate-400"
                        : item.isPast
                        ? "bg-slate-950/30 text-slate-500"
                        : "bg-slate-800/40 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-blue-400 text-[11px] shrink-0">
                        {item.time}
                      </span>
                      <span className="font-medium truncate">{item.name}</span>
                    </div>

                    <div className="shrink-0 pl-2">
                      {item.status === "SUDAH_BERBUNYI" && (
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-semibold">
                          Sudah Berbunyi
                        </span>
                      )}
                      {(item.status === "SEDANG_BERBUNYI" || item.status === "SEDANG_DIPICU") && (
                        <span className="text-[10px] bg-blue-900 text-blue-200 border border-blue-600 px-2 py-0.5 rounded font-semibold animate-pulse">
                          Sedang Dipicu
                        </span>
                      )}
                      {item.status === "TERLEWAT" && (
                        <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                          Sudah Lewat
                        </span>
                      )}
                      {item.status === "AKAN_DATANG" && (
                        <span className="text-[10px] bg-blue-950/70 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-semibold">
                          Akan Datang
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="border-t border-slate-800/80 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Volume Slider Control */}
        <div className="flex items-center space-x-3 w-full md:w-72">
          <button
            onClick={() => {
              const newVol = volume > 0 ? 0 : 80;
              setVolume(newVol);
              if (audioElementRef.current) audioElementRef.current.volume = newVol / 100;
            }}
            className="text-slate-400 hover:text-white"
          >
            {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              const val = Number(e.target.value);
              setVolume(val);
              if (audioElementRef.current) audioElementRef.current.volume = val / 100;
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-xs font-mono text-slate-400 w-10 text-right">{volume}%</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {!audioUnlocked && (
            <button
              onClick={unlockAudio}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
            >
              <Radio className="h-4 w-4" />
              <span>Aktifkan Audio</span>
            </button>
          )}

          <button
            onClick={triggerTestSound}
            className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 text-xs transition-colors flex items-center space-x-2"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Tes Suara Speaker</span>
          </button>

          <a
            href="/"
            className="rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 px-3.5 py-2.5 text-xs font-medium transition-colors"
          >
            Buka Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
