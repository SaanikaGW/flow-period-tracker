"use client";
import { useState, useEffect, useCallback } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import type { SymptomLog, CycleEvent } from "@/lib/db";

const SYMPTOMS = [
  { id: "cramps",            label: "Cramps",            emoji: "😣" },
  { id: "bloating",          label: "Bloating",          emoji: "🫧" },
  { id: "headache",          label: "Headache",          emoji: "🤕" },
  { id: "fatigue",           label: "Fatigue",           emoji: "😴" },
  { id: "back_pain",         label: "Back Pain",         emoji: "🔙" },
  { id: "mood_swings",       label: "Mood Swings",       emoji: "🎭" },
  { id: "nausea",            label: "Nausea",            emoji: "🤢" },
  { id: "breast_tenderness", label: "Breast Tenderness", emoji: "💗" },
  { id: "acne",              label: "Acne",              emoji: "😤" },
  { id: "insomnia",          label: "Insomnia",          emoji: "🌙" },
];

const FLOW_LEVELS = [
  { id: "none",   label: "None",   color: "bg-gray-100 text-gray-500 border-gray-200" },
  { id: "light",  label: "Light",  color: "bg-pink-50  text-pink-500  border-pink-200" },
  { id: "medium", label: "Medium", color: "bg-rose-50  text-rose-500  border-rose-200" },
  { id: "heavy",  label: "Heavy",  color: "bg-rose-100 text-rose-700  border-rose-300" },
];

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function Spinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
  );
}

export default function TrackerPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [cycleEvents, setCycleEvents] = useState<CycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [flowLevel, setFlowLevel] = useState("none");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, cycleRes] = await Promise.all([
        fetch("/api/symptoms"),
        fetch("/api/cycle"),
      ]);
      setLogs(await logsRes.json());
      setCycleEvents(await cycleRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchData();

    // One-time migration from localStorage v2 data
    const migrated = localStorage.getItem("flow_migrated_v3");
    if (!migrated) {
      const old = localStorage.getItem("flow_logs");
      if (old) {
        try {
          const oldLogs = JSON.parse(old) as Array<{
            date: string; symptoms: string[]; flow_level: string; notes: string;
          }>;
          Promise.all(
            oldLogs.map((l) =>
              fetch("/api/symptoms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(l),
              })
            )
          ).then(() => {
            localStorage.removeItem("flow_logs");
            localStorage.setItem("flow_migrated_v3", "true");
            fetchData();
          });
        } catch { /* ignore */ }
      }
      localStorage.setItem("flow_migrated_v3", "true");
    }
  }, [isSignedIn, fetchData]);

  // Pre-fill form when the selected date already has a log
  useEffect(() => {
    const existing = logs.find((l) => l.date === date);
    if (existing) {
      setSelectedSymptoms(existing.symptoms);
      setFlowLevel(existing.flow_level ?? "none");
      setNotes(existing.notes ?? "");
    } else {
      setSelectedSymptoms([]);
      setFlowLevel("none");
      setNotes("");
    }
  }, [date, logs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/symptoms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, symptoms: selectedSymptoms, flow_level: flowLevel, notes }),
    });
    await fetchData();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/symptoms/${id}`, { method: "DELETE" });
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  const periodStartForDate = cycleEvents.find((e) => e.date === date && e.event_type === "period_start");
  const periodEndForDate = cycleEvents.find((e) => e.date === date && e.event_type === "period_end");

  async function toggleCycleEvent(type: "period_start" | "period_end") {
    const existing = type === "period_start" ? periodStartForDate : periodEndForDate;
    if (existing) {
      await fetch(`/api/cycle/${existing.id}`, { method: "DELETE" });
      setCycleEvents((prev) => prev.filter((e) => e.id !== existing.id));
    } else {
      await fetch("/api/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: type, date }),
      });
      const res = await fetch("/api/cycle");
      setCycleEvents(await res.json());
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-2xl shadow-md">
          🌸
        </div>
        <h1 className="text-xl font-bold text-gray-900">Welcome to Flow</h1>
        <p className="text-sm text-gray-400 text-center max-w-xs">
          Sign in to track your symptoms, log your cycle, and get personalized health insights.
        </p>
        <SignInButton mode="modal">
          <button className="px-6 py-2.5 rounded-full bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-all shadow-sm">
            Sign in to get started
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">How are you feeling?</h1>
        <p className="text-sm text-gray-400">Log your symptoms to track patterns over time.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 space-y-6">
        {/* Date */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-gray-50"
          />
        </div>

        {/* Period tracking */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Period Tracking</label>
          <p className="text-xs text-gray-400">Mark when your period starts or ends — used for cycle predictions.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleCycleEvent("period_start")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                periodStartForDate
                  ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                  : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
              }`}
            >
              🔴 Period Started
            </button>
            <button
              type="button"
              onClick={() => toggleCycleEvent("period_end")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                periodEndForDate
                  ? "bg-pink-400 text-white border-pink-400 shadow-sm"
                  : "bg-white text-pink-500 border-pink-200 hover:bg-pink-50"
              }`}
            >
              🌸 Period Ended
            </button>
          </div>
        </div>

        <hr className="border-rose-50" />

        {/* Symptoms */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Symptoms
            {selectedSymptoms.length > 0 && (
              <span className="ml-2 text-xs font-normal text-rose-500">
                {selectedSymptoms.length} selected
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SYMPTOMS.map((s) => {
              const active = selectedSymptoms.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setSelectedSymptoms((prev) =>
                      prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                    )
                  }
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all duration-150 text-left ${
                    active
                      ? "bg-rose-500 text-white border-rose-500 shadow-sm scale-[1.02]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:bg-rose-50"
                  }`}
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="font-medium">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-rose-50" />

        {/* Flow Level */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Flow Level</label>
          <div className="grid grid-cols-4 gap-2">
            {FLOW_LEVELS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFlowLevel(f.id)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                  flowLevel === f.id
                    ? "bg-rose-500 text-white border-rose-500 shadow-sm scale-[1.03]"
                    : `${f.color} hover:opacity-80`
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-rose-50" />

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else worth noting..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none bg-gray-50"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            saved
              ? "bg-green-500 text-white"
              : "bg-rose-500 hover:bg-rose-600 text-white shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          }`}
        >
          {saved ? "✓ Logged!" : saving ? "Saving…" : "Log Symptoms"}
        </button>
      </form>

      {/* History */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-gray-800">
          History
          {logs.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">{logs.length} entries</span>
          )}
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-rose-200 p-8 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-gray-400">No logs yet. Start tracking above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-rose-50 px-4 py-4 flex items-start justify-between hover:border-rose-200 transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{formatDate(log.date)}</span>
                    {log.flow_level && log.flow_level !== "none" && (
                      <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full capitalize font-medium">
                        {log.flow_level} flow
                      </span>
                    )}
                    {cycleEvents.find((e) => e.date === log.date && e.event_type === "period_start") && (
                      <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">
                        🔴 Period started
                      </span>
                    )}
                    {cycleEvents.find((e) => e.date === log.date && e.event_type === "period_end") && (
                      <span className="text-xs bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full font-medium">
                        🌸 Period ended
                      </span>
                    )}
                  </div>
                  {log.symptoms.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {log.symptoms.map((s) => {
                        const sym = SYMPTOMS.find((x) => x.id === s);
                        return (
                          <span key={s} className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                            {sym?.emoji} {sym?.label ?? s.replace("_", " ")}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No symptoms selected</p>
                  )}
                  {log.notes && (
                    <p className="text-xs text-gray-500 italic">&ldquo;{log.notes}&rdquo;</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="ml-3 mt-0.5 text-gray-200 hover:text-rose-400 transition-colors text-sm leading-none shrink-0"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
