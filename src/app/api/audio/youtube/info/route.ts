import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getYouTubeInfo, validateYouTubeUrl } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL YouTube diperlukan." }, { status: 400 });
    }

    const validation = validateYouTubeUrl(url);
    if (!validation.valid || !validation.cleanUrl) {
      return NextResponse.json(
        { error: "Format link YouTube tidak valid. Gunakan format seperti https://www.youtube.com/watch?v=... atau https://youtu.be/..." },
        { status: 400 }
      );
    }

    const info = await getYouTubeInfo(validation.cleanUrl);
    return NextResponse.json({ success: true, info });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal mengambil informasi video YouTube." },
      { status: 500 }
    );
  }
}
