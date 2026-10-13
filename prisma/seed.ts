import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureDefaultChime } from "../src/lib/default-sound";
import { initDefaultSettings } from "../src/lib/settings";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Menjalankan seeder SmartBell Local...");

  // 1. Inisialisasi Pengaturan Default
  await initDefaultSettings();
  console.log("✅ Pengaturan sistem terinisialisasi.");

  // 2. Buat File Audio Default (Chime)
  const defaultAudioId = await ensureDefaultChime();
  console.log("✅ Audio lonceng bawaan siap (ID:", defaultAudioId, ")");

  // 3. Buat Admin Pertama jika belum ada
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("AdminSmartBell123!", salt);

    const admin = await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        fullName: "Administrator Utama",
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("✅ Akun administrator awal dibuat:");
    console.log("   Username: admin");
    console.log("   Password: AdminSmartBell123! (Harap segera ubah setelah login)");
  } else {
    console.log("ℹ️ Akun administrator sudah ada:", existingAdmin.username);
  }

  // 4. Buat Hari Libur Nasional Contoh
  const holidays = [
    { name: "Tahun Baru Masehi", date: "2026-01-01", isRecurringYearly: true },
    { name: "Hari Pendidikan Nasional", date: "2026-05-02", isRecurringYearly: true },
    { name: "Hari Kemerdekaan RI Ke-81", date: "2026-08-17", isRecurringYearly: true },
    { name: "Hari Guru Nasional", date: "2026-11-25", isRecurringYearly: true },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      update: {},
      create: h,
    });
  }
  console.log("✅ Hari libur contoh ditambahkan.");

  // 5. Buat Template Jadwal Sekolah Contoh (Senin - Jumat)
  const existingSchedules = await prisma.bellSchedule.count();
  if (existingSchedules === 0) {
    const templateSchedules = [
      {
        name: "Bel Masuk Sekolah",
        time: "07:00",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]),
        bellType: "MASUK",
        audioAssetId: defaultAudioId,
        volume: 90,
        repeatCount: 2,
        repeatIntervalSec: 3,
        notes: "Siswa dan guru berbaris di lapangan",
      },
      {
        name: "Bel Mulai Pelajaran Pertama",
        time: "07:15",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]),
        bellType: "MULAI_PELAJARAN",
        audioAssetId: defaultAudioId,
        volume: 85,
        repeatCount: 1,
        repeatIntervalSec: 2,
        notes: "Pelajaran jam ke-1 dimulai",
      },
      {
        name: "Bel Istirahat Pertama",
        time: "09:45",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]),
        bellType: "ISTIRAHAT",
        audioAssetId: defaultAudioId,
        volume: 85,
        repeatCount: 1,
        repeatIntervalSec: 2,
        notes: "Waktu istirahat siswa 30 menit",
      },
      {
        name: "Bel Masuk Setelah Istirahat",
        time: "10:15",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]),
        bellType: "MASUK_SETELAH_ISTIRAHAT",
        audioAssetId: defaultAudioId,
        volume: 85,
        repeatCount: 1,
        repeatIntervalSec: 2,
        notes: "Siswa kembali ke kelas masing-masing",
      },
      {
        name: "Bel Pergantian Pelajaran",
        time: "11:45",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]),
        bellType: "PERGANTIAN_PELAJARAN",
        audioAssetId: defaultAudioId,
        volume: 80,
        repeatCount: 1,
        repeatIntervalSec: 2,
        notes: "Pergantian mata pelajaran siang",
      },
      {
        name: "Bel Pulang Sekolah",
        time: "14:00",
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]),
        bellType: "PULANG",
        audioAssetId: defaultAudioId,
        volume: 95,
        repeatCount: 2,
        repeatIntervalSec: 3,
        notes: "Kegiatan belajar mengajar selesai",
      },
    ];

    for (const item of templateSchedules) {
      await prisma.bellSchedule.create({ data: item });
    }
    console.log(`✅ ${templateSchedules.length} template jadwal sekolah berhasil dibuat.`);
  }

  console.log("🎉 Seeding selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("Gagal saat seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
