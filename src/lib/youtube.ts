import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import ffmpegStatic from "ffmpeg-static";
import { prisma } from "./db";
import { AUDIO_STORAGE_DIR } from "./audio-storage";

const execFileAsync = promisify(execFile);

// Direktori binary alat bantu
const BIN_DIR = path.resolve(process.cwd(), "data/bin");
if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

export interface YouTubeInfo {
  videoId: string;
  title: string;
  duration: number; // detik
  durationFormatted: string;
  uploader?: string;
  thumbnailUrl?: string;
}

/**
 * Validasi dan ekstrak Video ID dari URL YouTube (standard, shorts, embed, shortlink)
 */
export function validateYouTubeUrl(url: string): { valid: boolean; videoId?: string; cleanUrl?: string } {
  if (!url || typeof url !== "string") return { valid: false };
  const trimmed = url.trim();

  // Pola regex komprehensif untuk YouTube
  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      return {
        valid: true,
        videoId,
        cleanUrl: `https://www.youtube.com/watch?v=vv${videoId}`.replace("vv", ""),
      };
    }
  }

  return { valid: false };
}

/**
 * Format detik ke mm:ss atau hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Ambil path eksekusi yt-dlp, unduh jika belum ada
 */
export async function getYtDlpPath(): Promise<string> {
  const isWindows = process.platform === "win32";
  const binaryName = isWindows ? "yt-dlp.exe" : "yt-dlp";

  // Cek di data/bin/
  const binPath = path.join(BIN_DIR, binaryName);
  if (fs.existsSync(binPath)) {
    return binPath;
  }

  // Cek di data/
  const dataPath = path.join(process.cwd(), "data", binaryName);
  if (fs.existsSync(dataPath)) {
    return dataPath;
  }

  // Unduh yt-dlp secara otomatis dari rilis resmi GitHub jika belum ada
  console.log(`Mengunduh ${binaryName} dari GitHub Releases...`);
  const downloadUrl = isWindows
    ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Gagal mengunduh yt-dlp (${res.status} ${res.statusText})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(binPath, Buffer.from(arrayBuffer));

  if (!isWindows) {
    // Beri izin eksekusi di unix
    try {
      fs.chmodSync(binPath, 0o755);
    } catch {}
  }

  return binPath;
}

/**
 * Ambil path FFmpeg dari ffmpeg-static atau sistem
 */
export function getFFmpegPath(): string | null {
  if (ffmpegStatic && typeof ffmpegStatic === "string" && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return null;
}

/**
 * Ambil informasi video YouTube (judul, durasi, thumbnail)
 */
export async function getYouTubeInfo(url: string): Promise<YouTubeInfo> {
  const validation = validateYouTubeUrl(url);
  if (!validation.valid || !validation.videoId || !validation.cleanUrl) {
    throw new Error("URL YouTube tidak valid.");
  }

  const cleanUrl = validation.cleanUrl;
  const videoId = validation.videoId;

  try {
    const ytDlp = await getYtDlpPath();
    const args = ["--dump-json", "--no-download", "--js-runtimes", "node", cleanUrl];

    const { stdout } = await execFileAsync(ytDlp, args, { timeout: 30000 });
    const data = JSON.parse(stdout);

    const duration = data.duration || 0;
    return {
      videoId,
      title: data.title || "Audio YouTube",
      duration,
      durationFormatted: formatDuration(duration),
      uploader: data.uploader || data.channel || "",
      thumbnailUrl: data.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (err: any) {
    console.warn("yt-dlp dump-json gagal, mencoba oEmbed fallback:", err.message);

    // Fallback oEmbed jika yt-dlp lambat atau ada kendala
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        return {
          videoId,
          title: oembed.title || "Audio YouTube",
          duration: 0,
          durationFormatted: "Bervariasi",
          uploader: oembed.author_name || "",
          thumbnailUrl: oembed.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    } catch {}

    throw new Error(`Gagal mengambil data video YouTube: ${err.message}`);
  }
}

/**
 * Unduh dan konversi audio YouTube ke file lokal MP3
 */
export async function downloadYouTubeAudio(
  url: string,
  displayName?: string
): Promise<{ success: boolean; asset?: any; error?: string }> {
  const validation = validateYouTubeUrl(url);
  if (!validation.valid || !validation.cleanUrl) {
    return { success: false, error: "URL YouTube tidak valid." };
  }

  const cleanUrl = validation.cleanUrl;
  const ytDlp = await getYtDlpPath();
  const ffmpeg = getFFmpegPath();

  // Dapatkan info video terlebih dahulu
  let videoInfo: YouTubeInfo;
  try {
    videoInfo = await getYouTubeInfo(cleanUrl);
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  // Batasi durasi maksimum demi integritas performa bel (maksimal 30 menit)
  if (videoInfo.duration > 1800) {
    return {
      success: false,
      error: "Durasi video terlalu panjang (maksimum 30 menit untuk audio bel sekolah).",
    };
  }

  const storedFileName = `${crypto.randomUUID()}.mp3`;
  const targetFilePath = path.join(AUDIO_STORAGE_DIR, storedFileName);

  const args: string[] = ["--js-runtimes", "node"];

  if (ffmpeg) {
    args.push(
      "--ffmpeg-location",
      ffmpeg,
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0"
    );
  } else {
    // Fallback bila tanpa ffmpeg
    args.push("-f", "bestaudio[ext=m4a]/bestaudio");
  }

  args.push("--no-playlist", "-o", targetFilePath, cleanUrl);

  try {
    await execFileAsync(ytDlp, args, { timeout: 120000 });

    // Periksa apakah file benar-benar tercipta
    let actualFilePath = targetFilePath;
    let actualStoredName = storedFileName;
    let mimeType = "audio/mpeg";

    if (!fs.existsSync(actualFilePath)) {
      // Cek kemungkinan ekstensi lain jika tanpa konversi mp3
      const baseNoExt = targetFilePath.replace(/\.[^/.]+$/, "");
      const possibleExtensions = [".m4a", ".webm", ".opus", ".ogg"];
      let found = false;

      for (const ext of possibleExtensions) {
        if (fs.existsSync(baseNoExt + ext)) {
          actualFilePath = baseNoExt + ext;
          actualStoredName = path.basename(actualFilePath);
          mimeType = ext === ".m4a" ? "audio/mp4" : "audio/webm";
          found = true;
          break;
        }
      }

      if (!found) {
        return { success: false, error: "Gagal menyimpan file audio dari YouTube." };
      }
    }

    const stat = fs.statSync(actualFilePath);
    const finalName = (displayName && displayName.trim()) || videoInfo.title;

    // Simpan ke database
    const asset = await prisma.audioAsset.create({
      data: {
        name: finalName,
        originalFileName: `${videoInfo.title}.mp3`.substring(0, 100),
        storedFileName: actualStoredName,
        fileSize: stat.size,
        mimeType,
        durationSec: videoInfo.duration || null,
        sourceType: "YOUTUBE",
        sourceUrl: cleanUrl,
      },
    });

    return { success: true, asset };
  } catch (err: any) {
    // Bersihkan file parsial jika gagal
    if (fs.existsSync(targetFilePath)) {
      try {
        fs.unlinkSync(targetFilePath);
      } catch {}
    }
    return {
      success: false,
      error: `Gagal mengunduh audio YouTube: ${err.message}`,
    };
  }
}
