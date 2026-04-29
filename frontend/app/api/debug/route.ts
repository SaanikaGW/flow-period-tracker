import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasKey: !!process.env.OPEN_API_KEY,
    keyPrefix: process.env.OPEN_API_KEY?.slice(0, 10) ?? "not set",
  });
}
