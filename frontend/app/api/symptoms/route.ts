import { NextResponse } from "next/server";
import { getAllLogs, logSymptom } from "@/lib/db";

export async function GET() {
  const logs = getAllLogs();
  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  const { date, symptoms, flow_level, notes } = await req.json();
  logSymptom(date, symptoms, flow_level ?? null, notes ?? null);
  return NextResponse.json({ status: "ok" });
}
