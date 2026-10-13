import { describe, it, expect } from "vitest";
import { validateAudioFile } from "../src/lib/audio-storage";
import { createChimeWavBuffer } from "../src/lib/default-sound";

describe("Validasi dan Manajemen File Audio", () => {
  it("menerima file audio MP3/WAV yang valid", () => {
    const res = validateAudioFile("bel_masuk.mp3", "audio/mpeg", 1024 * 500);
    expect(res.valid).toBe(true);
    expect(res.ext).toBe(".mp3");
  });

  it("menolak file dengan ekstensi selain audio yang diizinkan (keamanan)", () => {
    const res = validateAudioFile("script.sh", "application/x-sh", 100);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("tidak didukung");
  });

  it("menolak file yang melebihi batas 50MB", () => {
    const overLimit = 55 * 1024 * 1024;
    const res = validateAudioFile("huge_audio.mp3", "audio/mpeg", overLimit);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("melebihi batas");
  });

  it("membersihkan nama file dari karakter path traversal atau berbahaya", () => {
    const maliciousName = "../../../etc/passwd;test.mp3";
    const res = validateAudioFile(maliciousName, "audio/mpeg", 1024);
    expect(res.valid).toBe(true);
    expect(res.sanitizedName).not.toContain("..");
    expect(res.sanitizedName).not.toContain("/");
  });

  it("dapat menghasilkan buffer WAV lonceng sekolah bawaan dengan header RIFF valid", () => {
    const buf = createChimeWavBuffer(1.0);
    expect(buf.length).toBeGreaterThan(44);
    expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
    expect(buf.toString("ascii", 8, 12)).toBe("WAVE");
    expect(buf.toString("ascii", 12, 16)).toBe("fmt ");
    expect(buf.toString("ascii", 36, 40)).toBe("data");
  });
});
