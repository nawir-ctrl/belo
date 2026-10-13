import { z } from "zod";

export const BELL_TYPES = [
  { value: "MASUK", label: "Bel Masuk" },
  { value: "MULAI_PELAJARAN", label: "Bel Mulai Pelajaran" },
  { value: "PERGANTIAN_PELAJARAN", label: "Bel Pergantian Pelajaran" },
  { value: "ISTIRAHAT", label: "Bel Istirahat" },
  { value: "MASUK_SETELAH_ISTIRAHAT", label: "Bel Masuk Setelah Istirahat" },
  { value: "PERGANTIAN_SESI", label: "Bel Pergantian Sesi" },
  { value: "PULANG", label: "Bel Pulang" },
  { value: "KHUSUS", label: "Bel Khusus" },
] as const;

export const scheduleSchema = z.object({
  name: z.string().min(2, "Nama kegiatan minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam harus HH:mm (24-jam, misal 07:00)"),
  daysOfWeek: z.array(z.number().min(1).max(7)).min(1, "Pilih minimal satu hari aktif"),
  bellType: z.enum([
    "MASUK",
    "MULAI_PELAJARAN",
    "PERGANTIAN_PELAJARAN",
    "ISTIRAHAT",
    "MASUK_SETELAH_ISTIRAHAT",
    "PERGANTIAN_SESI",
    "PULANG",
    "KHUSUS",
  ]),
  audioAssetId: z.string().nullable().optional(),
  volume: z.number().min(0, "Volume minimal 0").max(100, "Volume maksimal 100").default(100),
  repeatCount: z.number().min(1, "Pengulangan minimal 1x").max(5, "Pengulangan maksimal 5x").default(1),
  repeatIntervalSec: z.number().min(1, "Jeda minimal 1 detik").max(10, "Jeda maksimal 10 detik").default(2),
  isActive: z.boolean().default(true),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD").nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD").nullable().optional(),
  priority: z.number().default(1),
  specialPeriodId: z.string().nullable().optional(),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").nullable().optional(),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;
