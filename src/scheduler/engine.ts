import { prisma } from "../lib/db";
import {
  getDateString,
  getTimeString,
  getDayOfWeek,
  parseLocalTimeToDate,
  DEFAULT_TIMEZONE,
} from "../lib/timezone";
import { getSetting, setSetting } from "../lib/settings";

export interface SchedulerCheckResult {
  triggeredCount: number;
  skippedCount: number;
  occurrences: string[];
  skippedOccurrences: string[];
  currentTime: string;
  currentDate: string;
  isHoliday: boolean;
  holidayName?: string;
}

/**
 * Mesin Scheduler Utama SmartBell Local
 * Menilai semua jadwal aktif terhadap waktu lokal saat ini, mengecek hari libur,
 * periode khusus, toleransi catch-up, dan mencatat occurrence unik ke BellExecution.
 */
export async function evaluateSchedules(
  now: Date = new Date()
): Promise<SchedulerCheckResult> {
  // 1. Periksa apakah sistem scheduler aktif di pengaturan
  const isEnabled = (await getSetting("SCHEDULER_ENABLED", "true")) === "true";
  const timezone = await getSetting("TIMEZONE", DEFAULT_TIMEZONE);
  const catchupMinutes = parseInt(await getSetting("CATCHUP_MAX_MINUTES", "5"), 10);

  // Perbarui detak jantung scheduler
  await setSetting("LAST_SCHEDULER_HEARTBEAT", now.toISOString(), "SCHEDULER");

  if (!isEnabled) {
    return {
      triggeredCount: 0,
      skippedCount: 0,
      occurrences: [],
      skippedOccurrences: [],
      currentTime: getTimeString(now, timezone),
      currentDate: getDateString(now, timezone),
      isHoliday: false,
    };
  }

  const currentDateStr = getDateString(now, timezone);
  const currentTimeStr = getTimeString(now, timezone);
  const currentDayOfWeek = getDayOfWeek(now, timezone); // 1 = Senin, ..., 7 = Minggu

  // 2. Periksa apakah hari ini adalah Hari Libur
  const holiday = await prisma.holiday.findFirst({
    where: {
      OR: [
        { date: currentDateStr },
        // Untuk hari libur tahunan berulang (misal tanggal & bulan cocok)
        {
          isRecurringYearly: true,
          date: {
            endsWith: currentDateStr.substring(4), // cocokkan "-MM-DD"
          },
        },
      ],
    },
  });

  // 3. Periksa apakah sedang dalam Periode Khusus (Ramadan, Ujian, dll)
  const activeSpecialPeriod = await prisma.specialPeriod.findFirst({
    where: {
      isActive: true,
      startDate: { lte: currentDateStr },
      endDate: { gte: currentDateStr },
    },
    orderBy: { priority: "desc" },
  });

  // 4. Ambil jadwal aktif
  // Jika ada periode khusus aktif, utamakan jadwal periode tersebut
  let schedules = await prisma.bellSchedule.findMany({
    where: {
      isActive: true,
      ...(activeSpecialPeriod
        ? {
            OR: [
              { specialPeriodId: activeSpecialPeriod.id },
              // Jadwal umum yang tidak bentrok atau jika tidak ada jadwal khusus
              { specialPeriodId: null },
            ],
          }
        : {
            specialPeriodId: null,
          }),
    },
    include: {
      audioAsset: true,
    },
    orderBy: [{ priority: "desc" }, { time: "asc" }],
  });

  // Jika ada jadwal periode khusus, saring jadwal umum yang berbenturan jam
  if (activeSpecialPeriod) {
    const specialTimes = new Set(
      schedules
        .filter((s) => s.specialPeriodId === activeSpecialPeriod.id)
        .map((s) => s.time)
    );
    schedules = schedules.filter(
      (s) => s.specialPeriodId === activeSpecialPeriod.id || !specialTimes.has(s.time)
    );
  }

  let triggeredCount = 0;
  let skippedCount = 0;
  const triggeredOccurrences: string[] = [];
  const skippedOccurrences: string[] = [];

  // Hitung waktu saat ini dalam menit sejak tengah malam
  const [nowH, nowM] = currentTimeStr.split(":").map(Number);
  const nowMinutesFromMidnight = nowH * 60 + nowM;

  for (const schedule of schedules) {
    // A. Periksa hari aktif (JSON array string misal "[1,2,3,4,5]")
    let activeDays: number[] = [];
    try {
      activeDays = JSON.parse(schedule.daysOfWeek);
    } catch {
      activeDays = [1, 2, 3, 4, 5, 6];
    }

    if (!activeDays.includes(currentDayOfWeek)) {
      continue;
    }

    // B. Periksa rentang tanggal mulai dan akhir jika diatur
    if (schedule.startDate && schedule.startDate > currentDateStr) {
      continue;
    }
    if (schedule.endDate && schedule.endDate < currentDateStr) {
      continue;
    }

    // C. Kunci deduplikasi unik: SCHED_{id}_{tanggal}_{jam}
    const occurrenceKey = `SCHED_${schedule.id}_${currentDateStr}_${schedule.time}`;

    // Cek apakah occurrence sudah pernah tercatat di database
    const existingExecution = await prisma.bellExecution.findUnique({
      where: { occurrenceKey },
    });

    if (existingExecution) {
      // Sudah pernah dieksekusi atau tercatat, jangan diproses ulang
      continue;
    }

    // D. Evaluasi waktu jadwal
    const [schedH, schedM] = schedule.time.split(":").map(Number);
    const schedMinutesFromMidnight = schedH * 60 + schedM;
    const diffMinutes = nowMinutesFromMidnight - schedMinutesFromMidnight;

    // Jika waktu jadwal belum tiba hari ini
    if (diffMinutes < 0) {
      continue;
    }

    // Target datetime untuk scheduledFor
    const scheduledForDate = parseLocalTimeToDate(schedule.time, currentDateStr, timezone);

    // E. Jika hari ini Libur, catat sebagai SKIPPED agar tidak berbunyi
    if (holiday) {
      try {
        await prisma.bellExecution.create({
          data: {
            scheduleId: schedule.id,
            occurrenceKey,
            bellName: schedule.name,
            bellType: schedule.bellType,
            scheduledFor: scheduledForDate,
            triggeredAt: now,
            status: "SKIPPED",
            errorMessage: `Dilewati karena hari libur: ${holiday.name}`,
            isManual: false,
            audioAssetId: schedule.audioAssetId,
            volume: schedule.volume,
            repeatCount: schedule.repeatCount,
            repeatIntervalSec: schedule.repeatIntervalSec,
          },
        });
        skippedCount++;
        skippedOccurrences.push(occurrenceKey);
      } catch (err: any) {
        // Unique constraint race condition handled
      }
      continue;
    }

    // F. Kebijakan Catch-Up untuk jadwal terlewat
    // Jika selisih waktu sudah melebihi toleransi catchup (misal server mati lama lalu hidup kembali)
    if (diffMinutes > catchupMinutes) {
      try {
        await prisma.bellExecution.create({
          data: {
            scheduleId: schedule.id,
            occurrenceKey,
            bellName: schedule.name,
            bellType: schedule.bellType,
            scheduledFor: scheduledForDate,
            triggeredAt: now,
            status: "SKIPPED",
            errorMessage: `Dilewati karena jadwal terlewat ${diffMinutes} menit (batas toleransi: ${catchupMinutes} menit)`,
            isManual: false,
            audioAssetId: schedule.audioAssetId,
            volume: schedule.volume,
            repeatCount: schedule.repeatCount,
            repeatIntervalSec: schedule.repeatIntervalSec,
          },
        });
        skippedCount++;
        skippedOccurrences.push(occurrenceKey);
      } catch (err: any) {
        // Abaikan jika sudah ada
      }
      continue;
    }

    // G. Jadwal jatuh tempo dan dalam toleransi catch-up (0 <= diffMinutes <= catchupMinutes)
    // Picu eksekusi baru dengan status "TRIGGERED"
    try {
      await prisma.bellExecution.create({
        data: {
          scheduleId: schedule.id,
          occurrenceKey,
          bellName: schedule.name,
          bellType: schedule.bellType,
          scheduledFor: scheduledForDate,
          triggeredAt: now,
          status: "TRIGGERED",
          isManual: false,
          audioAssetId: schedule.audioAssetId,
          volume: schedule.volume,
          repeatCount: schedule.repeatCount,
          repeatIntervalSec: schedule.repeatIntervalSec,
        },
      });
      triggeredCount++;
      triggeredOccurrences.push(occurrenceKey);
    } catch (err: any) {
      // Jika terjadi race condition atau sudah diinsert oleh thread lain, abaikan
      console.warn(`Duplicate occurrence prevention for ${occurrenceKey}:`, err.message);
    }
  }

  return {
    triggeredCount,
    skippedCount,
    occurrences: triggeredOccurrences,
    skippedOccurrences,
    currentTime: currentTimeStr,
    currentDate: currentDateStr,
    isHoliday: !!holiday,
    holidayName: holiday?.name,
  };
}
