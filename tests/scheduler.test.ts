import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { evaluateSchedules } from "../src/scheduler/engine";
import { ensureDefaultChime } from "../src/lib/default-sound";
import { setSetting } from "../src/lib/settings";

describe("Mesin Scheduler SmartBell Local", () => {
  let defaultAudioId: string;

  beforeEach(async () => {
    // Bersihkan tabel eksekusi untuk pengujian yang deterministik
    await prisma.bellExecution.deleteMany();
    await setSetting("SCHEDULER_ENABLED", "true");
    await setSetting("TIMEZONE", "Asia/Makassar");
    await setSetting("CATCHUP_MAX_MINUTES", "5");
    defaultAudioId = await ensureDefaultChime();
  });

  it("mencegah eksekusi ganda pada jadwal dan jam yang sama (Deduplikasi Occurrence)", async () => {
    // Buat jadwal spesifik untuk pengujian
    const testSchedule = await prisma.bellSchedule.create({
      data: {
        name: "Uji Coba Bel Masuk",
        time: "07:00",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]), // Semua hari
        bellType: "MASUK",
        audioAssetId: defaultAudioId,
        volume: 80,
        isActive: true,
      },
    });

    // Simulasikan waktu saat ini: 07:00 WITA (Asia/Makassar)
    // 07:00 WITA = 23:00 UTC hari sebelumnya
    const simulatedNow = new Date("2026-10-13T23:00:00.000Z"); // 2026-10-14 07:00 WITA

    // Evaluasi siklus pertama
    const result1 = await evaluateSchedules(simulatedNow);
    expect(result1.triggeredCount).toBeGreaterThanOrEqual(1);
    expect(result1.occurrences.some((occ) => occ.includes(testSchedule.id))).toBe(true);

    // Cek bahwa BellExecution telah tersimpan di database
    const executions = await prisma.bellExecution.findMany({
      where: { scheduleId: testSchedule.id },
    });
    expect(executions.length).toBe(1);
    expect(executions[0].status).toBe("TRIGGERED");

    // Evaluasi siklus kedua pada waktu yang sama persis (simulasi polling berikutnya)
    const result2 = await evaluateSchedules(simulatedNow);
    expect(result2.occurrences.some((occ) => occ.includes(testSchedule.id))).toBe(false);

    // Pastikan tidak ada eksekusi ganda di database
    const executionsAfter = await prisma.bellExecution.findMany({
      where: { scheduleId: testSchedule.id },
    });
    expect(executionsAfter.length).toBe(1);

    // Bersihkan
    await prisma.bellSchedule.delete({ where: { id: testSchedule.id } });
  });

  it("menerapkan kebijakan catch-up dan melewati jadwal lama di luar toleransi batas waktu", async () => {
    const testSchedule = await prisma.bellSchedule.create({
      data: {
        name: "Uji Catch-Up Terlewat",
        time: "07:00",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
        bellType: "MASUK",
        audioAssetId: defaultAudioId,
        volume: 80,
        isActive: true,
      },
    });

    // Simulasikan waktu saat ini: 07:20 WITA (terlewat 20 menit, toleransi default 5 menit)
    const simulatedLate = new Date("2026-10-13T23:20:00.000Z");

    const result = await evaluateSchedules(simulatedLate);
    expect(result.skippedCount).toBeGreaterThanOrEqual(1);

    // Periksa status di database dicatat sebagai SKIPPED dengan alasan yang jelas
    const execution = await prisma.bellExecution.findFirst({
      where: { scheduleId: testSchedule.id },
    });
    expect(execution).toBeDefined();
    expect(execution?.status).toBe("SKIPPED");
    expect(execution?.errorMessage).toContain("terlewat 20 menit");

    // Bersihkan
    await prisma.bellSchedule.delete({ where: { id: testSchedule.id } });
  });

  it("melewati bel otomatis jika tanggal jatuh pada hari libur", async () => {
    const holidayDate = "2026-10-14";
    // Buat data libur
    await prisma.holiday.upsert({
      where: { date: holidayDate },
      update: {},
      create: { name: "Hari Libur Khusus Uji Coba", date: holidayDate },
    });

    const testSchedule = await prisma.bellSchedule.create({
      data: {
        name: "Bel di Hari Libur",
        time: "07:00",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
        bellType: "MASUK",
        audioAssetId: defaultAudioId,
        isActive: true,
      },
    });

    const simulatedDate = new Date("2026-10-13T23:00:00.000Z"); // 2026-10-14 07:00 WITA
    const result = await evaluateSchedules(simulatedDate);

    expect(result.isHoliday).toBe(true);
    expect(result.holidayName).toBe("Hari Libur Khusus Uji Coba");

    const execution = await prisma.bellExecution.findFirst({
      where: { scheduleId: testSchedule.id },
    });
    expect(execution?.status).toBe("SKIPPED");
    expect(execution?.errorMessage).toContain("hari libur");

    // Bersihkan
    await prisma.bellSchedule.delete({ where: { id: testSchedule.id } });
    await prisma.holiday.delete({ where: { date: holidayDate } });
  });
});
