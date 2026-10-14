import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "./db";

export const AUDIO_STORAGE_DIR = path.resolve(process.cwd(), process.env.AUDIO_DIR || "data/audio");

// Pastikan direktori selalu siap
if (!fs.existsSync(AUDIO_STORAGE_DIR)) {
  fs.mkdirSync(AUDIO_STORAGE_DIR, { recursive: true });
}

export const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a"];
export const ALLOWED_MIME_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/m4a"];
export const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  ext?: string;
}

/**
 * Validasi file audio yang diunggah
 */
export function validateAudioFile(
  fileName: string,
  mimeType: string,
  fileSizeBytes: number
): AudioValidationResult {
  if (fileSizeBytes > MAX_AUDIO_SIZE_BYTES) {
    return { valid: false, error: "Ukuran file melebihi batas maksimum 50MB." };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Format file ${ext} tidak didukung. Hanya file MP3, WAV, atau OGG yang diizinkan.`,
    };
  }

  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType) && !mimeType.startsWith("audio/")) {
    return {
      valid: false,
      error: `Tipe MIME ${mimeType} tidak valid untuk audio.`,
    };
  }

  // Bersihkan nama file dari karakter berbahaya
  const sanitizedName = path
    .basename(fileName)
    .replace(/[^a-zA-Z0-9._\-\s]/g, "")
    .trim()
    .substring(0, 100);

  if (!sanitizedName) {
    return { valid: false, error: "Nama file tidak valid." };
  }

  return { valid: true, sanitizedName, ext };
}

/**
 * Simpan buffer audio ke direktori data/audio dengan nama aman dan buat record di DB
 */
export async function saveAudioFile(
  displayName: string,
  originalFileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ success: boolean; asset?: any; error?: string }> {
  const validation = validateAudioFile(originalFileName, mimeType, buffer.length);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const safeExtension = validation.ext || ".mp3";
  // Buat nama acak aman dengan UUID
  const storedFileName = `${crypto.randomUUID()}${safeExtension}`;
  const targetFilePath = path.join(AUDIO_STORAGE_DIR, storedFileName);

  try {
    // Tulis ke filesystem lokal
    fs.writeFileSync(targetFilePath, buffer);

    // Simpan metadata ke SQLite
    const asset = await prisma.audioAsset.create({
      data: {
        name: displayName.trim() || path.basename(originalFileName, safeExtension),
        originalFileName: validation.sanitizedName || originalFileName,
        storedFileName,
        fileSize: buffer.length,
        mimeType: mimeType || "audio/mpeg",
      },
    });

    return { success: true, asset };
  } catch (err: any) {
    // Bersihkan file jika DB error
    if (fs.existsSync(targetFilePath)) {
      try {
        fs.unlinkSync(targetFilePath);
      } catch {}
    }
    return { success: false, error: `Gagal menyimpan audio: ${err.message}` };
  }
}

/**
 * Cek apakah file audio sedang digunakan oleh jadwal aktif
 */
export async function isAudioInUse(audioAssetId: string): Promise<{ inUse: boolean; schedules: string[] }> {
  const activeSchedules = await prisma.bellSchedule.findMany({
    where: {
      OR: [
        { audioAssetId },
        { audioAssetIds: { contains: audioAssetId } },
      ],
      isActive: true,
    },
    select: { name: true, time: true },
  });

  return {
    inUse: activeSchedules.length > 0,
    schedules: activeSchedules.map((s) => `${s.name} (${s.time})`),
  };
}

/**
 * Hapus file audio dengan proteksi ketergantungan jadwal
 */
export async function deleteAudioFile(
  audioAssetId: string,
  force: boolean = false
): Promise<{ success: boolean; error?: string; inUseSchedules?: string[] }> {
  const asset = await prisma.audioAsset.findUnique({
    where: { id: audioAssetId },
  });

  if (!asset) {
    return { success: false, error: "File audio tidak ditemukan di database." };
  }

  const usage = await isAudioInUse(audioAssetId);
  if (usage.inUse && !force) {
    return {
      success: false,
      error: "Audio masih digunakan oleh jadwal aktif.",
      inUseSchedules: usage.schedules,
    };
  }

  try {
    const filePath = path.join(AUDIO_STORAGE_DIR, asset.storedFileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.audioAsset.delete({
      where: { id: audioAssetId },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Gagal menghapus file: ${err.message}` };
  }
}

/**
 * Ambil absolute path file audio yang tersimpan secara aman
 */
export function getAudioFilePath(storedFileName: string): string | null {
  // Cegah path traversal
  const safeName = path.basename(storedFileName);
  const fullPath = path.join(AUDIO_STORAGE_DIR, safeName);

  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}
