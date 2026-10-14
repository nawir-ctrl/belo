import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import {
  getDateString,
  getTimeString,
  getDayOfWeek,
  formatIndonesianDate,
  DEFAULT_TIMEZONE,
  parseLocalTimeToDate,
} from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const timezone = await getSetting("TIMEZONE", DEFAULT_TIMEZONE);
    const schoolName = await getSetting("SCHOOL_NAME", "SMP Negeri 1 SmartBell");
    const schedulerEnabled = (await getSetting("SCHEDULER_ENABLED", "true")) === "true";
    const lastHeartbeatStr = await getSetting("LAST_SCHEDULER_HEARTBEAT", "");
    const lastPlayerSeenStr = await getSetting("LAST_PLAYER_SEEN", "");

    const currentDateStr = getDateString(now, timezone);
    const currentTimeStr = getTimeString(now, timezone);
    const currentDayOfWeek = getDayOfWeek(now, timezone);
    const formattedDate = formatIndonesianDate(now, timezone);

    // Cek status scheduler heartbeat (aktif jika kurang dari 35 detik)
    let isSchedulerRunning = false;
    let schedulerHeartbeatDiffSec = 999999;
    if (lastHeartbeatStr) {
      const lastHeartbeat = new Date(lastHeartbeatStr).getTime();
      schedulerHeartbeatDiffSec = Math.floor((now.getTime() - lastHeartbeat) / 1000);
      isSchedulerRunning = schedulerHeartbeatDiffSec <= 35;
    }

    // Cek status halaman player (aktif jika kurang dari 35 detik)
    let isPlayerOnline = false;
    let playerLastSeenDiffSec = 999999;
    if (lastPlayerSeenStr) {
      const lastSeen = new Date(lastPlayerSeenStr).getTime();
      playerLastSeenDiffSec = Math.floor((now.getTime() - lastSeen) / 1000);
      isPlayerOnline = playerLastSeenDiffSec <= 35;
    }

    // Cek libur hari ini
    const holiday = await prisma.holiday.findFirst({
      where: {
        OR: [
          { date: currentDateStr },
          { isRecurringYearly: true, date: { endsWith: currentDateStr.substring(4) } },
        ],
      },
    });

    // Ambil semua jadwal aktif
    const allActiveSchedules = await prisma.bellSchedule.findMany({
      where: { isActive: true },
      include: { audioAsset: true },
      orderBy: { time: "asc" },
    });

    // Saring jadwal aktif hari ini
    const todaySchedules = allActiveSchedules.filter((s) => {
      try {
        const days = JSON.parse(s.daysOfWeek);
        if (!Array.isArray(days) || !days.includes(currentDayOfWeek)) return false;
      } catch {
        return false;
      }
      if (s.startDate && s.startDate > currentDateStr) return false;
      if (s.endDate && s.endDate < currentDateStr) return false;
      return true;
    });

    // Eksekusi hari ini
    const todayStart = new Date(`${currentDateStr}T00:00:00.000Z`);
    const todayExecutions = await prisma.bellExecution.findMany({
      where: {
        scheduledFor: { gte: todayStart },
      },
      include: { audioAsset: true },
      orderBy: { scheduledFor: "desc" },
    });

    const playedCount = todayExecutions.filter((e) => e.status === "PLAYED").length;
    const failedCount = todayExecutions.filter((e) => e.status === "FAILED").length;

    // Cari jadwal berikutnya hari ini
    const [nowH, nowM] = currentTimeStr.split(":").map(Number);
    const nowMinutes = nowH * 60 + nowM;

    let nextSchedule: any = null;
    let countdownSeconds = 0;

    for (const sched of todaySchedules) {
      const [sH, sM] = sched.time.split(":").map(Number);
      const schedMinutes = sH * 60 + sM;
      if (schedMinutes > nowMinutes) {
        nextSchedule = sched;
        const schedDate = parseLocalTimeToDate(sched.time, currentDateStr, timezone);
        countdownSeconds = Math.max(0, Math.floor((schedDate.getTime() - now.getTime()) / 1000));
        break;
      }
    }

    // Jika tidak ada lagi jadwal hari ini, cari jadwal terdekat di hari-hari berikutnya (hingga 7 hari ke depan)
    let nextUpcomingSchedule: any = null;
    let nextUpcomingDayLabel: string = "";
    let nextUpcomingCountdownSec: number = 0;

    if (!nextSchedule) {
      for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
        const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const targetDateStr = getDateString(targetDate, timezone);
        const targetDayOfWeek = getDayOfWeek(targetDate, timezone);

        // Cek hari libur pada tanggal target
        const isTargetHoliday = await prisma.holiday.findFirst({
          where: {
            OR: [
              { date: targetDateStr },
              { isRecurringYearly: true, date: { endsWith: targetDateStr.substring(4) } },
            ],
          },
        });
        if (isTargetHoliday) continue;

        const candidateSchedules = allActiveSchedules.filter((s) => {
          try {
            const days = JSON.parse(s.daysOfWeek);
            if (!Array.isArray(days) || !days.includes(targetDayOfWeek)) return false;
          } catch {
            return false;
          }
          if (s.startDate && s.startDate > targetDateStr) return false;
          if (s.endDate && s.endDate < targetDateStr) return false;
          return true;
        });

        if (candidateSchedules.length > 0) {
          nextUpcomingSchedule = candidateSchedules[0];
          const daysNames = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
          const dayName = daysNames[targetDayOfWeek] || "";
          nextUpcomingDayLabel = dayOffset === 1 ? `Besok (${dayName})` : `${dayName}, ${targetDateStr}`;

          const targetSchedDate = parseLocalTimeToDate(nextUpcomingSchedule.time, targetDateStr, timezone);
          nextUpcomingCountdownSec = Math.max(0, Math.floor((targetSchedDate.getTime() - now.getTime()) / 1000));
          break;
        }
      }
    }

    // Riwayat bel terbaru (8 terakhir)
    const recentExecutions = await prisma.bellExecution.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { audioAsset: true },
    });

    // Kumpulkan semua asset ID jadwal hari ini untuk nama tampilan
    const allAssetIds = new Set<string>();
    for (const s of todaySchedules) {
      if (s.audioAssetId) allAssetIds.add(s.audioAssetId);
      if (s.audioAssetIds) {
        try {
          const ids = JSON.parse(s.audioAssetIds);
          if (Array.isArray(ids)) ids.forEach((id) => allAssetIds.add(id));
        } catch {}
      }
    }

    const assetNamesMap = new Map();
    if (allAssetIds.size > 0) {
      const fetched = await prisma.audioAsset.findMany({
        where: { id: { in: Array.from(allAssetIds) } },
        select: { id: true, name: true },
      });
      fetched.forEach((a) => assetNamesMap.set(a.id, a.name));
    }

    // Bangun daftar agenda lengkap hari ini dengan status eksekusinya
    const todayAgenda = todaySchedules.map((s) => {
      const [h, m] = s.time.split(":").map(Number);
      const isPast = h * 60 + m <= nowMinutes;
      const execution = todayExecutions.find((e) => e.scheduleId === s.id);

      let status = "AKAN_DATANG";
      if (execution) {
        if (execution.status === "PLAYED") status = "SUDAH_BERBUNYI";
        else if (execution.status === "PLAYING") status = "SEDANG_BERBUNYI";
        else if (execution.status === "TRIGGERED") status = "SEDANG_DIPICU";
        else if (execution.status === "SKIPPED") status = "TERLEWAT";
        else if (execution.status === "FAILED") status = "GAGAL";
      } else if (isPast) {
        status = "TERLEWAT";
      }

      let sequenceIds: string[] = [];
      if (s.audioAssetIds) {
        try {
          const parsed = JSON.parse(s.audioAssetIds);
          if (Array.isArray(parsed)) sequenceIds = parsed;
        } catch {}
      }
      if (sequenceIds.length === 0 && s.audioAssetId) sequenceIds = [s.audioAssetId];
      const audioNames = sequenceIds.map((id) => assetNamesMap.get(id) || "Lonceng").filter(Boolean);
      const audioDisplayName =
        audioNames.length > 1
          ? `${audioNames.length} Suara: ${audioNames.join(" ➔ ")}`
          : audioNames[0] || s.audioAsset?.name || "Lonceng Bawaan";

      return {
        id: s.id,
        name: s.name,
        time: s.time,
        bellType: s.bellType,
        isPast,
        status,
        audioCount: audioNames.length,
        audioName: audioDisplayName,
      };
    });

    return NextResponse.json({
      schoolName,
      timezone,
      currentTime: currentTimeStr,
      currentDate: currentDateStr,
      formattedDate,
      schedulerEnabled,
      isSchedulerRunning,
      schedulerHeartbeatDiffSec,
      isPlayerOnline,
      playerLastSeenDiffSec,
      isHoliday: !!holiday,
      holidayName: holiday?.name,
      todaySchedulesCount: todaySchedules.length,
      playedCount,
      failedCount,
      nextSchedule: nextSchedule
        ? {
            id: nextSchedule.id,
            name: nextSchedule.name,
            time: nextSchedule.time,
            bellType: nextSchedule.bellType,
            volume: nextSchedule.volume,
          }
        : null,
      countdownSeconds,
      nextUpcomingSchedule: nextUpcomingSchedule
        ? {
            id: nextUpcomingSchedule.id,
            name: nextUpcomingSchedule.name,
            time: nextUpcomingSchedule.time,
            bellType: nextUpcomingSchedule.bellType,
            dayLabel: nextUpcomingDayLabel,
          }
        : null,
      nextUpcomingCountdownSec,
      todayAgenda,
      recentExecutions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
