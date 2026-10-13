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

    // Ambil jadwal hari ini
    const allActiveSchedules = await prisma.bellSchedule.findMany({
      where: { isActive: true },
      include: { audioAsset: true },
      orderBy: { time: "asc" },
    });

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
        // Hitung selisih detik
        const schedDate = parseLocalTimeToDate(sched.time, currentDateStr, timezone);
        countdownSeconds = Math.max(0, Math.floor((schedDate.getTime() - now.getTime()) / 1000));
        break;
      }
    }

    // Riwayat bel terbaru (10 terakhir)
    const recentExecutions = await prisma.bellExecution.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { audioAsset: true },
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
      todayAgenda: todaySchedules.map((s) => ({
        id: s.id,
        name: s.name,
        time: s.time,
        bellType: s.bellType,
        isPast: (() => {
          const [h, m] = s.time.split(":").map(Number);
          return h * 60 + m <= nowMinutes;
        })(),
      })),
      recentExecutions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
