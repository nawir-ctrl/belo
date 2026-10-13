import { evaluateSchedules } from "./engine";
import { getSetting, initDefaultSettings } from "../lib/settings";
import { ensureDefaultChime } from "../lib/default-sound";
import { getTimeWithSeconds } from "../lib/timezone";

let isRunning = true;
let isLoopBusy = false;

async function runWorker() {
  console.log("==================================================");
  console.log("🔔 SMARTBELL LOCAL - BACKGROUND SCHEDULER WORKER");
  console.log("==================================================");

  try {
    // Pastikan pengaturan awal & default sound sudah siap
    await initDefaultSettings();
    await ensureDefaultChime();
    console.log("✅ Inisialisasi pengaturan & nada bawaan berhasil.");
  } catch (err: any) {
    console.error("⚠️ Peringatan saat inisialisasi:", err.message);
  }

  const loop = async () => {
    if (!isRunning) return;
    if (isLoopBusy) return;

    isLoopBusy = true;
    try {
      const now = new Date();
      const tz = await getSetting("TIMEZONE", "Asia/Makassar");
      const result = await evaluateSchedules(now);

      if (result.triggeredCount > 0) {
        console.log(
          `[${getTimeWithSeconds(now, tz)}] 🔔 TRIGGERED ${result.triggeredCount} bel:`,
          result.occurrences.join(", ")
        );
      }

      if (result.skippedCount > 0) {
        console.log(
          `[${getTimeWithSeconds(now, tz)}] ⏭️ SKIPPED ${result.skippedCount} bel:`,
          result.skippedOccurrences.join(", ")
        );
      }
    } catch (err: any) {
      console.error("❌ Kesalahan pada siklus scheduler:", err.message);
    } finally {
      isLoopBusy = false;
    }
  };

  // Jalankan siklus pertama segera
  await loop();

  // Ambil interval dari pengaturan
  const intervalSec = parseInt(await getSetting("SCHEDULER_CHECK_INTERVAL_SEC", "10"), 10);
  const timer = setInterval(loop, Math.max(3000, intervalSec * 1000));

  const shutdown = () => {
    console.log("\n🛑 Menghentikan Scheduler Worker dengan aman...");
    isRunning = false;
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

runWorker().catch((err) => {
  console.error("Fatal error di worker:", err);
  process.exit(1);
});
