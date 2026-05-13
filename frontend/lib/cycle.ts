import type { CycleEvent } from "./db";

export type CyclePrediction = {
  predictedStart: string;
  predictedEnd: string;
  avgCycleLength: number;
  avgPeriodDuration: number;
};

export function computeCyclePrediction(events: CycleEvent[]): CyclePrediction | null {
  const starts = events
    .filter((e) => e.event_type === "period_start")
    .map((e) => e.date)
    .sort();

  if (starts.length < 2) return null;

  const gaps: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const a = new Date(starts[i - 1] + "T12:00:00");
    const b = new Date(starts[i] + "T12:00:00");
    gaps.push((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  }
  const avgCycleLength = Math.round(gaps.reduce((a, b) => a + b) / gaps.length);

  const ends = events
    .filter((e) => e.event_type === "period_end")
    .map((e) => e.date)
    .sort();

  let avgPeriodDuration = 5;
  const durations: number[] = [];
  for (const start of starts) {
    const startDate = new Date(start + "T12:00:00");
    const matchingEnd = ends.find((end) => {
      const endDate = new Date(end + "T12:00:00");
      const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 14;
    });
    if (matchingEnd) {
      const endDate = new Date(matchingEnd + "T12:00:00");
      durations.push(Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }
  if (durations.length > 0) {
    avgPeriodDuration = Math.round(durations.reduce((a, b) => a + b) / durations.length);
  }

  const lastStart = new Date(starts[starts.length - 1] + "T12:00:00");
  const predictedStartDate = new Date(lastStart.getTime() + avgCycleLength * 24 * 60 * 60 * 1000);
  const predictedEndDate = new Date(predictedStartDate.getTime() + avgPeriodDuration * 24 * 60 * 60 * 1000);

  return {
    predictedStart: predictedStartDate.toISOString().slice(0, 10),
    predictedEnd: predictedEndDate.toISOString().slice(0, 10),
    avgCycleLength,
    avgPeriodDuration,
  };
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
