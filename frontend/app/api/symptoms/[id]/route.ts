import { NextResponse } from "next/server";
import { deleteLog } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteLog(Number(id));
  return NextResponse.json({ status: "ok" });
}
