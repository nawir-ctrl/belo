import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { prisma } from "./db";
import { AUDIO_STORAGE_DIR } from "./audio-storage";

export const BACKUP_DIR = path.resolve(process.cwd(), process.env.BACKUP_DIR || "data/backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Membuat paket arsip backup lengkap (.zip) berisi SQLite DB dan folder audio/
 */
export async function createFullBackup(): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `smartbell_backup_${timestamp}.zip`;
    const targetZipPath = path.join(BACKUP_DIR, fileName);

    // 1. Eksekusi SQLite checkpoint agar WAL sinkron
    try {
      await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {}

    const dbPath = path.resolve(process.cwd(), "data/smartbell.db");
    const zip = new AdmZip();

    // Masukkan file database jika ada
    if (fs.existsSync(dbPath)) {
      zip.addLocalFile(dbPath);
    }

    // Masukkan folder audio jika ada
    if (fs.existsSync(AUDIO_STORAGE_DIR)) {
      const audioFiles = fs.readdirSync(AUDIO_STORAGE_DIR);
      for (const file of audioFiles) {
        const fullAudioPath = path.join(AUDIO_STORAGE_DIR, file);
        if (fs.statSync(fullAudioPath).isFile()) {
          zip.addLocalFile(fullAudioPath, "audio");
        }
      }
    }

    // Masukkan manifest informasi backup
    const manifest = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      description: "SmartBell Local Complete Backup",
    };
    zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"));

    // Tulis ke disk
    zip.writeZip(targetZipPath);

    return { success: true, filePath: targetZipPath, fileName };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Melakukan restore data dari file zip backup
 */
export async function restoreFromBackup(zipBuffer: Buffer): Promise<{ success: boolean; error?: string }> {
  const tempExtractDir = path.join(BACKUP_DIR, `temp_restore_${Date.now()}`);
  fs.mkdirSync(tempExtractDir, { recursive: true });

  try {
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(tempExtractDir, true);

    const extractedDb = path.join(tempExtractDir, "smartbell.db");
    const extractedAudioDir = path.join(tempExtractDir, "audio");
    const manifestPath = path.join(tempExtractDir, "manifest.json");

    // Validasi file
    if (!fs.existsSync(extractedDb) && !fs.existsSync(manifestPath)) {
      return { success: false, error: "Format file backup tidak valid. File manifest atau database tidak ditemukan." };
    }

    // Putuskan koneksi database sebelum overwrite
    await prisma.$disconnect();

    const currentDbPath = path.resolve(process.cwd(), "data/smartbell.db");
    if (fs.existsSync(extractedDb)) {
      fs.copyFileSync(extractedDb, currentDbPath);
    }

    // Salin file audio
    if (fs.existsSync(extractedAudioDir)) {
      const files = fs.readdirSync(extractedAudioDir);
      for (const file of files) {
        const srcFile = path.join(extractedAudioDir, file);
        const destFile = path.join(AUDIO_STORAGE_DIR, file);
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }

    // Reconnect prisma
    await prisma.$connect();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Gagal restore backup: ${err.message}` };
  } finally {
    // Bersihkan folder sementara
    try {
      if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
    } catch {}
  }
}
