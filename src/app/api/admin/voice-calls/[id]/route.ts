import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin-auth";

// GET — single call log by ID
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "r");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const callLog = await db.callLog.findUnique({
      where: { id },
    });

    if (!callLog) {
      return NextResponse.json(
        { error: "Arama kaydı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ callLog });
  } catch (error) {
    console.error("[voice-calls] GET [id] error:", error);
    return NextResponse.json(
      { error: "Arama kaydı alınamadı" },
      { status: 500 }
    );
  }
}

// PATCH — update isRead, notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission("orders", "w");
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // Only allow updating isRead and notes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (typeof body.isRead === "boolean") {
      data.isRead = body.isRead;
    }

    if (body.notes !== undefined) {
      data.notes = body.notes;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek alan belirtilmedi" },
        { status: 400 }
      );
    }

    const callLog = await db.callLog.update({
      where: { id },
      data,
    });

    return NextResponse.json({ callLog });
  } catch (error) {
    console.error("[voice-calls] PATCH [id] error:", error);

    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { error: "Arama kaydı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Arama kaydı güncellenemedi" },
      { status: 500 }
    );
  }
}
