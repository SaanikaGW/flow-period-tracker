import type { SymptomLog, CycleEvent } from "./db";
import type { CyclePrediction } from "./cycle";
import { daysUntil } from "./cycle";

export type PredictiveAlert = {
  id: string;
  icon: string;
  title: string;
  body: string;
  color: "rose" | "amber" | "pink" | "violet";
};

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "cramps",
  bloating: "bloating",
  headache: "headaches",
  fatigue: "fatigue",
  back_pain: "back pain",
  mood_swings: "mood swings",
  nausea: "nausea",
  breast_tenderness: "breast tenderness",
  acne: "acne",
  insomnia: "insomnia",
};

function getPrePeriodSymptoms(logs: SymptomLog[], cycleEvents: CycleEvent[]): string[] {
  const periodStarts = cycleEvents
    .filter((e) => e.event_type === "period_start")
    .map((e) => e.date)
    .sort();

  if (periodStarts.length < 2) return [];

  const symptomCounts: Record<string, number> = {};
  const logMap = Object.fromEntries(logs.map((l) => [l.date, l]));

  for (const start of periodStarts) {
    const startDate = new Date(start + "T12:00:00");
    for (let i = 1; i <= 4; i++) {
      const d = new Date(startDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const log = logMap[dateStr];
      if (log) {
        for (const s of log.symptoms) {
          symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        }
      }
    }
  }

  return Object.entries(symptomCounts)
    .filter(([, count]) => count / periodStarts.length >= 0.4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

export function buildPredictiveAlerts(
  logs: SymptomLog[],
  cycleEvents: CycleEvent[],
  prediction: CyclePrediction | null
): PredictiveAlert[] {
  if (!prediction) return [];

  const alerts: PredictiveAlert[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const days = daysUntil(prediction.predictedStart);
  const prePeriodSymptoms = getPrePeriodSymptoms(logs, cycleEvents);
  const symptomStr = prePeriodSymptoms.map((s) => SYMPTOM_LABELS[s] ?? s).join(", ");

  if (days > 0 && days <= 4) {
    const body =
      prePeriodSymptoms.length > 0
        ? `Based on your history, you tend to experience ${symptomStr} in the days before. It might be worth preparing.`
        : "Your cycle history suggests your period is on its way.";
    alerts.push({
      id: `period_soon_${today}`,
      icon: "🔴",
      title: `Period predicted in ${days} day${days === 1 ? "" : "s"}`,
      body,
      color: "rose",
    });
  } else if (days === 0) {
    const body =
      prePeriodSymptoms.length > 0
        ? `You typically experience ${symptomStr} around now — log your symptoms and mark period start if it begins.`
        : "Log today's symptoms and mark period start if it begins.";
    alerts.push({
      id: `period_today_${today}`,
      icon: "🌸",
      title: "Your period may start today",
      body,
      color: "pink",
    });
  } else if (days < 0 && today <= prediction.predictedEnd) {
    alerts.push({
      id: `period_active_${today}`,
      icon: "🌸",
      title: "Your period should be active",
      body: "Mark period start on today's log if you haven't — it keeps predictions accurate.",
      color: "pink",
    });
  } else if (days < 0 && today > prediction.predictedEnd) {
    const overdue = Math.abs(days);
    if (overdue >= 1 && overdue <= 7) {
      alerts.push({
        id: `period_late_${today}`,
        icon: "⚠️",
        title: `Period is ${overdue} day${overdue === 1 ? "" : "s"} later than predicted`,
        body: "Cycle lengths vary naturally. If this continues, it may be worth noting for your doctor.",
        color: "amber",
      });
    }
  }

  return alerts;
}

export function getCyclePhase(
  cycleEvents: CycleEvent[],
  prediction: CyclePrediction | null,
  date: string
): { phase: string; day: number } | null {
  const periodStarts = cycleEvents
    .filter((e) => e.event_type === "period_start")
    .map((e) => e.date)
    .sort();

  if (periodStarts.length === 0) return null;

  const lastStart = new Date(periodStarts[periodStarts.length - 1] + "T12:00:00");
  const target = new Date(date + "T12:00:00");
  const day = Math.round((target.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (day < 1) return null;

  const avgCycle = prediction?.avgCycleLength ?? 28;
  const avgPeriod = prediction?.avgPeriodDuration ?? 5;

  let phase: string;
  if (day <= avgPeriod) phase = "Menstrual";
  else if (day <= Math.round(avgCycle * 0.43)) phase = "Follicular";
  else if (day <= Math.round(avgCycle * 0.57)) phase = "Ovulatory";
  else phase = "Luteal";

  return { phase, day };
}
