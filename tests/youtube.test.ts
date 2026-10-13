import { describe, it, expect } from "vitest";
import {
  validateYouTubeUrl,
  formatDuration,
  getFFmpegPath,
  getYtDlpPath,
} from "../src/lib/youtube";
import fs from "fs";

describe("YouTube Utility & Validation", () => {
  it("harus memvalidasi berbagai format URL YouTube yang benar", () => {
    const urls = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&feature=shared",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc123xyz",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ];

    for (const u of urls) {
      const res = validateYouTubeUrl(u);
      expect(res.valid).toBe(true);
      expect(res.videoId).toBe("dQw4w9WgXcQ");
      expect(res.cleanUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    }
  });

  it("harus menolak URL yang tidak valid atau kosong", () => {
    const invalidUrls = [
      "",
      "   ",
      "https://google.com",
      "https://vimeo.com/123456",
      "https://youtube.com/random/page",
      "not-a-url",
    ];

    for (const u of invalidUrls) {
      const res = validateYouTubeUrl(u);
      expect(res.valid).toBe(false);
    }
  });

  it("harus memformat durasi detik ke format mm:ss dan hh:mm:ss dengan benar", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(19)).toBe("00:19");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(599)).toBe("09:59");
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3665)).toBe("1:01:05");
  });

  it("harus menemukan FFmpeg path yang valid", () => {
    const ffmpegPath = getFFmpegPath();
    expect(ffmpegPath).not.toBeNull();
    if (ffmpegPath) {
      expect(fs.existsSync(ffmpegPath)).toBe(true);
    }
  });

  it("harus menemukan yt-dlp binary yang valid", async () => {
    const ytDlpPath = await getYtDlpPath();
    expect(fs.existsSync(ytDlpPath)).toBe(true);
  });
});
