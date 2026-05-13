"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { SymptomLog, CycleEvent } from "@/lib/db";
import { computeCyclePrediction, daysUntil } from "@/lib/cycle";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const FLOW_BG: Record<string, string> = {
  light:  "bg-pink-100",
  medium: "bg-rose-200",
  heavy:  "bg-rose-300",
};

function getCalendarDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  return days;
}

function isDateInRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export default function CalendarPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [cycleEvents, setCycleEvents] = useState<CycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      fetch("/api/symptoms").then((r) => r.json()),
      fetch("/api/cycle").then((r) => r.json()),
    ]).then(([l, c]) => {
      setLogs(Array.isArray(l) ? l : []);
      setCycleEvents(Array.isArray(c) ? c : []);
    }).finally(() => setLoading(false));
  }, [isSignedIn]);

  const prediction = computeCyclePrediction(cycleEvents);
  const days = getCalendarDays(viewYear, viewMonth);

  const logMap = Object.fromEntries(logs.map((l) => [l.date, l]));
  const periodStartDates = new Set(
    cycleEvents.filter((e) => e.event_type === "period_start").map((e) => e.date)
  );
  const periodEndDates = new Set(
    cycleEvents.filter((e) => e.event_type === "period_end").map((e) => e.date)
  );

  // Find actual period ranges for coloring in-between days
  const periodStarts = cycleEvents
    .filter((e) => e.event_type === "period_start")
    .map((e) => e.date)
    .sort();

  function isActivePeriodDay(date: string): boolean {
    for (const start of periodStarts) {
      if (date < start) continue;
      const matchingEnd = cycleEvents.find(
        (e) => e.event_type === "period_end" && e.date >= start && e.date >= date
      );
      if (matchingEnd) {
        if (date <= matchingEnd.date) return true;
      } else {
        // No end recorded — color up to 7 days after start
        const startD = new Date(start + "T12:00:00");
        const dateD = new Date(date + "T12:00:00");
        const diff = (dateD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0 && diff <= 7) return true;
      }
    }
    return false;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  const todayStr = today.toISOString().slice(0, 10);
  const selectedLog = selected ? logMap[selected] : null;
  const selectedIsPeriodStart = selected ? periodStartDates.has(selected) : false;
  const selectedIsPeriodEnd = selected ? periodEndDates.has(selected) : false;

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-5 h-5 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3 animate-fade-in">
        <p className="text-4xl">📅</p>
        <p className="text-lg font-semibold text-gray-700">Sign in to view your calendar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Cycle Calendar</h1>
        <p className="text-sm text-gray-400">Your logged flow, symptoms, and predicted cycle.</p>
      </div>

      {/* Prediction banner */}
      {prediction ? (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔮</span>
            <span className="text-sm font-bold text-gray-800">Cycle Prediction</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-400">Avg cycle</p>
              <p className="text-base font-bold text-rose-500">{prediction.avgCycleLength} days</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Avg period</p>
              <p className="text-base font-bold text-rose-500">{prediction.avgPeriodDuration} days</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Next period</p>
              <p className="text-base font-bold text-rose-500">
                {daysUntil(prediction.predictedStart) > 0
                  ? `in ${daysUntil(prediction.predictedStart)}d`
                  : daysUntil(prediction.predictedStart) === 0
                  ? "Today"
                  : `${Math.abs(daysUntil(prediction.predictedStart))}d ago`}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Predicted:{" "}
            {new Date(prediction.predictedStart + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {new Date(prediction.predictedEnd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
      ) : cycleEvents.length < 2 ? (
        <div className="bg-rose-50 rounded-2xl border border-rose-100 p-4 text-sm text-rose-600">
          💡 Mark at least 2 period start dates on the Tracker to enable cycle predictions.
        </div>
      ) : null}

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 space-y-4">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors"
          >
            ‹
          </button>
          <span className="text-sm font-bold text-gray-800">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors"
          >
            ›
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const log = logMap[day];
            const hasSymptoms = log && log.symptoms.length > 0;
            const flowBg = log?.flow_level ? FLOW_BG[log.flow_level] : "";
            const isPeriodStart = periodStartDates.has(day);
            const isPeriodEnd = periodEndDates.has(day);
            const isActivePeriod = isActivePeriodDay(day);
            const isPredicted = prediction
              ? isDateInRange(day, prediction.predictedStart, prediction.predictedEnd)
              : false;
            const isToday = day === todayStr;
            const isSelected = day === selected;
            const dayNum = parseInt(day.slice(8), 10);

            return (
              <button
                key={day}
                onClick={() => setSelected(selected === day ? null : day)}
                className={[
                  "relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all",
                  isSelected ? "ring-2 ring-rose-500 ring-offset-1" : "",
                  isActivePeriod ? "bg-rose-200" : flowBg || (isPredicted ? "bg-rose-50 border border-dashed border-rose-300" : "hover:bg-gray-50"),
                  isToday ? "font-bold" : "",
                  log || isPeriodStart || isPeriodEnd ? "text-gray-800" : "text-gray-400",
                ].filter(Boolean).join(" ")}
              >
                <span className={isToday ? "underline underline-offset-2" : ""}>{dayNum}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {isPeriodStart && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
                  {isPeriodEnd && <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" />}
                  {hasSymptoms && !isPeriodStart && !isPeriodEnd && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-rose-50">
          {[
            { dot: "bg-rose-200 w-3 h-3 rounded-sm", label: "Period days" },
            { dot: "bg-red-500 w-1.5 h-1.5 rounded-full", label: "Period started" },
            { dot: "bg-pink-400 w-1.5 h-1.5 rounded-full", label: "Period ended" },
            { dot: "bg-gray-400 w-1.5 h-1.5 rounded-full", label: "Symptoms logged" },
            { dot: "w-3 h-3 rounded-sm bg-rose-50 border border-dashed border-rose-300", label: "Predicted" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`inline-block shrink-0 ${item.dot}`} />
              <span className="text-[10px] text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 space-y-3 animate-fade-in">
          <h3 className="text-sm font-bold text-gray-800">
            {new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </h3>
          <div className="space-y-2">
            {selectedIsPeriodStart && (
              <p className="text-xs text-red-500 font-medium">🔴 Period started</p>
            )}
            {selectedIsPeriodEnd && (
              <p className="text-xs text-pink-500 font-medium">🌸 Period ended</p>
            )}
            {selectedLog ? (
              <>
                {selectedLog.flow_level && selectedLog.flow_level !== "none" && (
                  <p className="text-xs text-gray-600">
                    Flow: <span className="font-medium capitalize">{selectedLog.flow_level}</span>
                  </p>
                )}
                {selectedLog.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLog.symptoms.map((s) => (
                      <span key={s} className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                        {s.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}
                {selectedLog.notes && (
                  <p className="text-xs text-gray-500 italic">&ldquo;{selectedLog.notes}&rdquo;</p>
                )}
              </>
            ) : !selectedIsPeriodStart && !selectedIsPeriodEnd ? (
              <p className="text-xs text-gray-400">Nothing logged for this day.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
