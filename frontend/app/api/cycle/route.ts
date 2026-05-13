import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCycleEvents, addCycleEvent } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const events = await getCycleEvents(userId);
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { event_type, date } = await req.json();
  const event = await addCycleEvent(userId, event_type, date);
  return NextResponse.json(event);
}
