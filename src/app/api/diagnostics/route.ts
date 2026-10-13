import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { AUDIO_STORAGE_DIR } from "@/lib/audio-storage";
import {
  getTimeWithSeconds,
  getDateString,
  formatIndonesianDate,
  DEFAULT_TIMEZONE,
} from "@/lib/timezone";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET() {
  try {
    const now = new Date();
    const tz = await getSetting("TIMEZONE", DEFAULT_TIMEZONE);
    const lastHeartbeatStr = await getSetting("LAST_SCHEDULER_HEARTBEAT", "");
    const lastPlayerSeenStr = await getSetting("LAST_PLAYER_SEEN", "");
    const schedulerEnabled = (await getSetting("SCHEDULER_ENABLED", "true")) === "true";

    // 1. Status Scheduler
    let isSchedulerRunning = false;
    let schedulerDiffSec = null;
    if (lastHeartbeatStr) {
      const hb = new Date(lastHeartbeatStr).getTime();
      schedulerDiffSec = Math.floor((now.getTime() - hb) / 1000);
      isSchedulerRunning = schedulerDiffSec <= 35;
    }

    // 2. Status Player
    let isPlayerOnline = false;
    let playerDiffSec = null;
    if (lastPlayerSeenStr) {
      const lp = new Date(lastPlayerSeenStr).getTime();
      playerDiffSec = Math.floor((now.getTime() - lp) / 1000);
      isPlayerOnline = playerDiffSec <= 35;
    }

    // 3. Status Database SQLite
    let dbStatus = "OK";
    let dbSizeBytes = 0;
    const dbPath = path.resolve(process.cwd(), "data/smartbell.db");
    if (fs.existsSync(dbPath)) {
      dbSizeBytes = fs.statSync(dbPath).size;
    } else {
      dbStatus = "NOT_FOUND";
    }

    const [activeSchedulesCount, audioAssetsCount, executionsCount] = await Promise.all([
      prisma.bellSchedule.count({ where: { isActive: true } }),
      prisma.audioAsset.count(),
      prisma.bellExecution.count(),
    ]);

    // 4. Status Direktori Audio
    let audioDirStatus = "OK";
    let audioFilesOnDisk = 0;
    let audioTotalSizeBytes = 0;
    if (fs.existsSync(AUDIO_STORAGE_DIR)) {
      const files = fs.readdirSync(AUDIO_STORAGE_DIR);
      audioFilesOnDisk = files.length;
      for (const f of files) {
        try {
          audioTotalSizeBytes += fs.statSync(path.join(AUDIO_STORAGE_DIR, f)).size;
        } catch {}
      }
    } else {
      audioDirStatus = "NOT_FOUND";
    }

    // 5. System Info
    const systemInfo = {
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      freeMemMb: Math.round(os.freemem() / 1024 / 1024),
      totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
    };

    return NextResponse.json({
      systemTime: {
        iso: now.toISOString(),
        time: getTimeWithSeconds(now, tz),
        date: getDateString(now, tz),
        formatted: formatIndonesianDate(now, tz),
        timezone: tz,
      },
      scheduler: {
        enabled: schedulerEnabled,
        isRunning: isSchedulerRunning,
        lastHeartbeat: lastHeartbeatStr,
        heartbeatDiffSeconds: schedulerDiffSec,
      },
      player: {
        isOnline: isPlayerOnline,
        lastSeen: lastPlayerSeenStr,
        lastSeenDiffSeconds: playerDiffSec,
      },
      database: {
        status: dbStatus,
        sizeBytes: dbSizeBytes,
        activeSchedulesCount,
        audioAssetsCount,
        executionsCount,
      },
      audioStorage: {
        status: audioDirStatus,
        filesCount: audioFilesOnDisk,
        totalSizeBytes: audioTotalSizeBytes,
        path: "data/audio",
      },
      system: systemInfo,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
