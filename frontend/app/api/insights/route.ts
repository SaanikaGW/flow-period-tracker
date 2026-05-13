import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import type { SymptomLog, CycleEvent } from "@/lib/db";
import { computeCyclePrediction, daysUntil } from "@/lib/cycle";
import { getCyclePhase } from "@/lib/alerts";

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "cramps",
  bloating: "bloating",
  headache: "headache",
  fatigue: "fatigue",
  back_pain: "back pain",
  mood_swings: "mood swings",
  nausea: "nausea",
  breast_tenderness: "breast tenderness",
  acne: "acne",
  insomnia: "insomnia",
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { todayLog, recentLogs, cycleEvents } = (await req.json()) as {
    todayLog: { date: string; symptoms: string[]; flow_level: string; notes: string };
    recentLogs: SymptomLog[];
    cycleEvents: CycleEvent[];
  };

  const client = new OpenAI();
  const prediction = computeCyclePrediction(cycleEvents);
  const phaseInfo = getCyclePhase(cycleEvents, prediction, todayLog.date);

  const todaySymptoms =
    todayLog.symptoms.map((s) => SYMPTOM_LABELS[s] ?? s).join(", ") || "none";
  const todayFlow =
    todayLog.flow_level && todayLog.flow_level !== "none" ? todayLog.flow_level : null;

  // Symptom frequency over last 30 logs
  const symptomFreq: Record<string, number> = {};
  for (const log of recentLogs.slice(0, 30)) {
    for (const s of log.symptoms) {
      symptomFreq[s] = (symptomFreq[s] || 0) + 1;
    }
  }
  const freqStr = Object.entries(symptomFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s, c]) => `${SYMPTOM_LABELS[s] ?? s} (${c}×)`)
    .join(", ");

  const contextLines = [
    `Today (${todayLog.date}): symptoms: ${todaySymptoms}${todayFlow ? `, flow: ${todayFlow} flow` : ""}${todayLog.notes ? `, notes: "${todayLog.notes}"` : ""}`,
    phaseInfo
      ? `Cycle: day ${phaseInfo.day} — ${phaseInfo.phase} phase`
      : "",
    prediction
      ? `Next period predicted in ${daysUntil(prediction.predictedStart)} day(s), avg cycle ${prediction.avgCycleLength} days`
      : "",
    freqStr ? `Historical top symptoms: ${freqStr}` : "",
    `Total days logged: ${recentLogs.length}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content: `You are a warm, knowledgeable period health assistant.
Given a user's symptom log and cycle history, write a SHORT personalized insight (2–3 sentences MAX).
Rules:
- Be specific to their data — mention their actual symptoms, flow level, or cycle day
- Include ONE concrete, actionable suggestion
- Sound like a knowledgeable friend, not a clinical bot
- Do NOT start with "Based on" or "I"
- Do NOT give generic advice that ignores their specific log
- Keep it under 60 words`,
      },
      {
        role: "user",
        content: contextLines,
      },
    ],
  });

  const insight = response.choices[0]?.message?.content ?? "";
  return NextResponse.json({ insight });
}
