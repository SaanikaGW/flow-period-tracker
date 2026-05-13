import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteCycleEvent } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteCycleEvent(Number(id), userId);
  return NextResponse.json({ status: "ok" });
}
