import { describe, it, expect } from "vitest";
import {
  getTimeString,
  getDateString,
  getDayOfWeek,
  formatIndonesianDate,
  parseLocalTimeToDate,
} from "../src/lib/timezone";

describe("Modul Zona Waktu SmartBell Local", () => {
  it("mengonversi UTC ke Waktu Indonesia Tengah (Asia/Makassar) secara tepat", () => {
    // 00:00:00 UTC = 08:00:00 WITA (UTC+8)
    const utcDate = new Date("2026-10-13T00:00:00.000Z");
    const timeMakassar = getTimeString(utcDate, "Asia/Makassar");
    expect(timeMakassar).toBe("08:00");

    const dateMakassar = getDateString(utcDate, "Asia/Makassar");
    expect(dateMakassar).toBe("2026-10-13");
  });

  it("menangani pergantian tanggal lintas tengah malam secara akurat", () => {
    // 2026-10-13 17:00:00 UTC = 2026-10-14 01:00:00 WITA (sudah berganti hari)
    const utcMidnightCross = new Date("2026-10-13T17:00:00.000Z");
    const dateMakassar = getDateString(utcMidnightCross, "Asia/Makassar");
    const timeMakassar = getTimeString(utcMidnightCross, "Asia/Makassar");

    expect(dateMakassar).toBe("2026-10-14");
    expect(timeMakassar).toBe("01:00");
  });

  it("memformat nama hari dan tanggal dalam bahasa Indonesia", () => {
    const utcDate = new Date("2026-10-13T04:00:00.000Z"); // 12:00 WITA Selasa
    const indonesianFormatted = formatIndonesianDate(utcDate, "Asia/Makassar");
    expect(indonesianFormatted).toContain("Selasa");
    expect(indonesianFormatted).toContain("Oktober");
    expect(indonesianFormatted).toContain("2026");
  });

  it("menghitung indeks hari ISO-8601 dengan benar (1=Senin, 7=Minggu)", () => {
    // 2026-10-13 adalah hari Selasa (indeks 2)
    const tuesday = new Date("2026-10-13T04:00:00.000Z");
    expect(getDayOfWeek(tuesday, "Asia/Makassar")).toBe(2);
  });
});
