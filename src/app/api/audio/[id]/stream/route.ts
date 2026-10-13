import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAudioFilePath } from "@/lib/audio-storage";
import fs from "fs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const asset = await prisma.audioAsset.findUnique({
      where: { id: params.id },
    });

    if (!asset) {
      return new NextResponse("Audio tidak ditemukan.", { status: 404 });
    }

    const filePath = getAudioFilePath(asset.storedFileName);
    if (!filePath || !fs.existsSync(filePath)) {
      return new NextResponse("File audio fisik tidak ditemukan pada disk.", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const rangeHeader = req.headers.get("range");

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      // Convert Node readable stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": asset.mimeType || "audio/mpeg",
        },
      });
    } else {
      const fileStream = fs.createReadStream(filePath);
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream as any, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Accept-Ranges": "bytes",
          "Content-Type": asset.mimeType || "audio/mpeg",
        },
      });
    }
  } catch (err: any) {
    return new NextResponse(`Error streaming audio: ${err.message}`, { status: 500 });
  }
}
