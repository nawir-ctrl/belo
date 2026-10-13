import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const isManual = searchParams.get("isManual");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  try {
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (isManual !== null && isManual !== undefined && isManual !== "") {
      where.isManual = isManual === "true";
    }
    if (search) {
      where.bellName = { contains: search };
    }
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      where.scheduledFor = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const [total, executions] = await Promise.all([
      prisma.bellExecution.count({ where }),
      prisma.bellExecution.findMany({
        where,
        include: {
          audioAsset: {
            select: { id: true, name: true, originalFileName: true },
          },
        },
        orderBy: { scheduledFor: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      executions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
