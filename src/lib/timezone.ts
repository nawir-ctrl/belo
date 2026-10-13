import { format, toZonedTime } from "date-fns-tz";
import { format as formatDateFns } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "Asia/Makassar";

export const SUPPORTED_TIMEZONES = [
  { label: "WITA - Waktu Indonesia Tengah (Asia/Makassar)", value: "Asia/Makassar" },
  { label: "WIB - Waktu Indonesia Barat (Asia/Jakarta)", value: "Asia/Jakarta" },
  { label: "WIT - Waktu Indonesia Timur (Asia/Jayapura)", value: "Asia/Jayapura" },
  { label: "UTC (Coordinated Universal Time)", value: "UTC" },
];

/**
 * Mendapatkan objek waktu lokal yang sudah dikonversi ke zona waktu tujuan
 */
export function getZonedDate(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): Date {
  return toZonedTime(date, timezone);
}

/**
 * Format jam dalam 24-jam "HH:mm" (misal "07:00")
 */
export function getTimeString(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  return format(date, "HH:mm", { timeZone: timezone });
}

/**
 * Format jam dengan detik "HH:mm:ss" (misal "07:00:25")
 */
export function getTimeWithSeconds(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  return format(date, "HH:mm:ss", { timeZone: timezone });
}

/**
 * Format tanggal standar ISO "YYYY-MM-DD" (misal "2026-10-13")
 */
export function getDateString(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  return format(date, "yyyy-MM-dd", { timeZone: timezone });
}

/**
 * Mendapatkan indeks hari dalam seminggu (1 = Senin, ..., 7 = Minggu)
 */
export function getDayOfWeek(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): number {
  // date-fns: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayStr = format(date, "i", { timeZone: timezone }); // ISO-8601 day-of-week (1 = Monday, 7 = Sunday)
  return parseInt(dayStr, 10);
}

/**
 * Format tanggal lengkap berbahasa Indonesia (misal: "Selasa, 13 Oktober 2026")
 */
export function formatIndonesianDate(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  const zoned = getZonedDate(date, timezone);
  return formatDateFns(zoned, "EEEE, d MMMM yyyy", { locale: localeId });
}

/**
 * Mengubah string waktu "HH:mm" pada tanggal tertentu (di zona waktu tertentu) menjadi Date UTC
 */
export function parseLocalTimeToDate(
  timeStr: string,
  dateStr: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  // Buat string ISO-like dengan offset atau parse menggunakan Date
  const dateObj = new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  return toZonedTime(dateObj, timezone);
}

export const DAYS_OF_WEEK_NAMES = [
  { id: 1, name: "Senin", short: "Sen" },
  { id: 2, name: "Selasa", short: "Sel" },
  { id: 3, name: "Rabu", short: "Rab" },
  { id: 4, name: "Kamis", short: "Kam" },
  { id: 5, name: "Jumat", short: "Jum" },
  { id: 6, name: "Sabtu", short: "Sab" },
  { id: 7, name: "Minggu", short: "Min" },
];
