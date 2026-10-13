import { prisma } from "./db";

export const DEFAULT_SETTINGS: Record<string, { value: string; category: string; description: string }> = {
  SCHOOL_NAME: {
    value: "SMP Negeri 1 SmartBell",
    category: "GENERAL",
    description: "Nama resmi sekolah yang ditampilkan pada dashboard dan player",
  },
  TIMEZONE: {
    value: "Asia/Makassar",
    category: "GENERAL",
    description: "Zona waktu lokal sekolah (default Asia/Makassar - WITA)",
  },
  SCHEDULER_ENABLED: {
    value: "true",
    category: "SCHEDULER",
    description: "Status master sistem bel otomatis (true/false)",
  },
  CATCHUP_MAX_MINUTES: {
    value: "5",
    category: "SCHEDULER",
    description: "Toleransi maksimal menit untuk memutar jadwal yang terlewat setelah server restart",
  },
  DEFAULT_VOLUME: {
    value: "80",
    category: "AUDIO",
    description: "Tingkat volume default pemutar bel (0-100)",
  },
  SCHEDULER_CHECK_INTERVAL_SEC: {
    value: "10",
    category: "SCHEDULER",
    description: "Interval pemeriksaan jadwal oleh background worker dalam detik",
  },
  LAST_SCHEDULER_HEARTBEAT: {
    value: "",
    category: "SCHEDULER",
    description: "Timestamp detak jantung terakhir proses scheduler",
  },
  LAST_PLAYER_SEEN: {
    value: "",
    category: "PLAYER",
    description: "Timestamp interaksi terakhir dari halaman pemutar /player",
  },
  APP_LOGO: {
    value: "",
    category: "GENERAL",
    description: "Path atau base64 gambar logo sekolah",
  },
};

export async function getSetting(key: string, defaultValue?: string): Promise<string> {
  try {
    const item = await prisma.systemSetting.findUnique({
      where: { key },
    });
    if (item) return item.value;
  } catch (err) {
    console.error(`Error reading setting ${key}:`, err);
  }
  return defaultValue !== undefined ? defaultValue : (DEFAULT_SETTINGS[key]?.value ?? "");
}

export async function setSetting(key: string, value: string, category: string = "GENERAL", description?: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value, updatedAt: new Date() },
    create: {
      key,
      value,
      category,
      description: description || DEFAULT_SETTINGS[key]?.description || "",
    },
  });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  // Muat default dulu
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    result[k] = v.value;
  }
  try {
    const items = await prisma.systemSetting.findMany();
    for (const item of items) {
      result[item.key] = item.value;
    }
  } catch (err) {
    console.error("Error reading all settings:", err);
  }
  return result;
}

export async function initDefaultSettings(): Promise<void> {
  for (const [key, meta] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await prisma.systemSetting.findUnique({ where: { key } });
    if (!existing) {
      await prisma.systemSetting.create({
        data: {
          key,
          value: meta.value,
          category: meta.category,
          description: meta.description,
        },
      });
    }
  }
}
