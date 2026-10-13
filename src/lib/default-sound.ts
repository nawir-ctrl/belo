import fs from "fs";
import path from "path";
import { AUDIO_STORAGE_DIR } from "./audio-storage";
import { prisma } from "./db";

/**
 * Menghasilkan file audio WAV (PCM 16-bit 44.1kHz) nada lonceng sekolah 2-nada (C5 - G5)
 * Dibuat secara matematis murni dengan Buffer Node.js tanpa dependensi eksternal.
 */
export function createChimeWavBuffer(durationSec: number = 2.5): Buffer {
  const sampleRate = 44100;
  const numChannels = 1; // mono
  const bytesPerSample = 2; // 16-bit
  const totalSamples = Math.floor(sampleRate * durationSec);
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // Subchunk 1 "fmt "
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // Subchunk 2 "data"
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Nada 1: 587.33 Hz (D5) selama 1.0 detik
  // Nada 2: 880.00 Hz (A5) selama 1.5 detik
  const f1 = 587.33;
  const f2 = 880.00;
  const halfPoint = Math.floor(sampleRate * 1.0);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let freq = i < halfPoint ? f1 : f2;
    // Envelope decay eksponensial seperti dentang lonceng
    const noteT = i < halfPoint ? t : t - 1.0;
    const decay = Math.exp(-noteT * 3.0);
    // Gelombang sinus murni
    const sampleVal = Math.sin(2 * Math.PI * freq * t) * decay * 0.7;
    // Skala ke rentang 16-bit integer [-32768, 32767]
    const intVal = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
    buffer.writeInt16LE(intVal, 44 + i * 2);
  }

  return buffer;
}

/**
 * Memastikan default chime tersedia di folder data/audio dan terdaftar di database
 */
export async function ensureDefaultChime(): Promise<string> {
  const defaultFileName = "default_chime.wav";
  const filePath = path.join(AUDIO_STORAGE_DIR, defaultFileName);

  if (!fs.existsSync(filePath)) {
    const wavBuffer = createChimeWavBuffer(2.5);
    fs.writeFileSync(filePath, wavBuffer);
  }

  let asset = await prisma.audioAsset.findFirst({
    where: { storedFileName: defaultFileName },
  });

  if (!asset) {
    asset = await prisma.audioAsset.create({
      data: {
        name: "Lonceng Sekolah Bawaan (Default)",
        originalFileName: "lonceng_default.wav",
        storedFileName: defaultFileName,
        fileSize: fs.statSync(filePath).size,
        mimeType: "audio/wav",
        durationSec: 2.5,
      },
    });
  }

  return asset.id;
}
