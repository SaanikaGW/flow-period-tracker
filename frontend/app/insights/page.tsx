"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import type { SymptomLog } from "@/lib/db";
import { analyzeFlags, type HealthFlag } from "@/lib/flags";
import { useUser } from "@clerk/nextjs";

const SYMPTOM_LABELS: Record<string, { label: string; emoji: string }> = {
  cramps:            { label: "Cramps",            emoji: "😣" },
  bloating:          { label: "Bloating",          emoji: "🫧" },
  headache:          { label: "Headache",          emoji: "🤕" },
  fatigue:           { label: "Fatigue",           emoji: "😴" },
  back_pain:         { label: "Back Pain",         emoji: "🔙" },
  mood_swings:       { label: "Mood Swings",       emoji: "🎭" },
  nausea:            { label: "Nausea",            emoji: "🤢" },
  breast_tenderness: { label: "Breast Tenderness", emoji: "💗" },
  acne:              { label: "Acne",              emoji: "😤" },
  insomnia:          { label: "Insomnia",          emoji: "🌙" },
};

const FLOW_COLORS: Record<string, string> = {
  light:  "#fce7f3",
  medium: "#fda4af",
  heavy:  "#f43f5e",
  none:   "#e5e7eb",
};

const FLAG_BG: Record<string, string> = {
  discuss: "border-rose-200 bg-rose-50",
  watch:   "border-amber-200 bg-amber-50",
};

const FLAG_TEXT: Record<string, string> = {
  discuss: "text-rose-700",
  watch:   "text-amber-700",
};

const FLAG_BADGE: Record<string, string> = {
  discuss: "bg-rose-100 text-rose-600",
  watch:   "bg-amber-100 text-amber-600",
};

function FlagCard({ flag }: { flag: HealthFlag }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${FLAG_BG[flag.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{flag.icon}</span>
          <span className={`text-sm font-bold ${FLAG_TEXT[flag.severity]}`}>{flag.name}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${FLAG_BADGE[flag.severity]}`}>
          {flag.severity === "discuss" ? "Talk to your doctor" : "Keep an eye on this"}
        </span>
      </div>
      <p className={`text-xs ${FLAG_TEXT[flag.severity]}`}>{flag.summary}</p>
      <button
        onClick={() => setExpanded((x) => !x)}
        className={`text-xs font-medium underline underline-offset-2 ${FLAG_TEXT[flag.severity]} opacity-70 hover:opacity-100`}
      >
        {expanded ? "Show less" : "Learn more"}
      </button>
      {expanded && (
        <div className="space-y-2 pt-1 animate-fade-in">
          <p className={`text-xs leading-relaxed ${FLAG_TEXT[flag.severity]}`}>{flag.detail}</p>
          <div className={`rounded-lg px-3 py-2 text-xs font-medium ${FLAG_BADGE[flag.severity]}`}>
            💡 Why it&apos;s often missed: {flag.why_overlooked}
          </div>
        </div>
      )}
    </div>
  );
}

function calcStreak(logs: SymptomLog[]): number {
  if (!logs.length) return 0;
  const dates = new Set(logs.map((l) => l.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function InsightsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/symptoms")
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [isSignedIn]);

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
        <p className="text-4xl">📊</p>
        <p className="text-lg font-semibold text-gray-700">Sign in to see your insights</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3 animate-fade-in">
        <p className="text-4xl">📊</p>
        <p className="text-lg font-semibold text-gray-700">No data yet</p>
        <p className="text-sm text-gray-400">Start logging symptoms on the Tracker page to see your insights.</p>
      </div>
    );
  }

  const flags = analyzeFlags(logs);

  const symptomCounts: Record<string, number> = {};
  for (const log of logs) {
    for (const s of log.symptoms) {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    }
  }
  const symptomData = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({
      id,
      name: `${SYMPTOM_LABELS[id]?.emoji ?? ""} ${SYMPTOM_LABELS[id]?.label ?? id}`,
      count,
    }));

  const flowCounts: Record<string, number> = {};
  for (const log of logs) {
    if (log.flow_level && log.flow_level !== "none") {
      flowCounts[log.flow_level] = (flowCounts[log.flow_level] || 0) + 1;
    }
  }
  const flowData = Object.entries(flowCounts).map(([level, value]) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1),
    value,
    color: FLOW_COLORS[level],
  }));

  const topSymptom = symptomData[0];
  const streak = calcStreak(logs);
  const totalDays = logs.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Your Insights</h1>
        <p className="text-sm text-gray-400">
          Patterns from your {totalDays} logged {totalDays === 1 ? "entry" : "entries"}.
        </p>
      </div>

      {/* Health Flags */}
      {flags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-800">Health Patterns to Know</h2>
            <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium">
              {flags.length} flagged
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Based on your logged data, these patterns match conditions that are often overlooked in women.
          </p>
          <div className="space-y-3">
            {flags.map((flag) => (
              <FlagCard key={flag.id} flag={flag} />
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 text-center space-y-1">
          <p className="text-2xl font-bold text-rose-500">{totalDays}</p>
          <p className="text-xs text-gray-500">Days Logged</p>
        </div>
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 text-center space-y-1">
          <p className="text-2xl font-bold text-rose-500">{streak}</p>
          <p className="text-xs text-gray-500">Day Streak</p>
        </div>
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 text-center space-y-1">
          <p className="text-xl font-bold text-rose-500">
            {topSymptom ? SYMPTOM_LABELS[topSymptom.id]?.emoji : "—"}
          </p>
          <p className="text-xs text-gray-500">
            {topSymptom ? SYMPTOM_LABELS[topSymptom.id]?.label : "No symptoms"}
          </p>
          <p className="text-[10px] text-gray-400">Most common</p>
        </div>
      </div>

      {/* Symptom frequency */}
      {symptomData.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-800">Symptom Frequency</h2>
          <ResponsiveContainer width="100%" height={symptomData.length * 40 + 20}>
            <BarChart data={symptomData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={148} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "#fff1f2" }}
                formatter={(v) => [`${v} ${v === 1 ? "time" : "times"}`, "Logged"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #fce7f3", fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {symptomData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#f43f5e" : "#fda4af"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Flow distribution */}
      {flowData.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-800">Flow Distribution</h2>
          <div className="flex items-center gap-6">
            <PieChart width={120} height={120}>
              <Pie
                data={flowData}
                cx={55}
                cy={55}
                innerRadius={30}
                outerRadius={55}
                dataKey="value"
                strokeWidth={2}
              >
                {flowData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {flowData.map((f) => (
                <div key={f.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ background: f.color, border: "1px solid #fce7f3" }}
                    />
                    <span className="text-gray-600 capitalize">{f.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{f.value}×</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent logs summary */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-800">Recent Activity</h2>
        <div className="space-y-1">
          {logs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center gap-3 py-1.5 border-b border-rose-50 last:border-0">
              <span className="text-xs text-gray-400 w-20 shrink-0">
                {new Date(log.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <div className="flex flex-wrap gap-1 flex-1">
                {log.symptoms.length > 0 ? (
                  log.symptoms.map((s) => (
                    <span key={s} className="text-xs bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full">
                      {SYMPTOM_LABELS[s]?.emoji} {SYMPTOM_LABELS[s]?.label ?? s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-300">No symptoms</span>
                )}
              </div>
              {log.flow_level && log.flow_level !== "none" && (
                <span className="text-xs text-rose-500 capitalize shrink-0">{log.flow_level}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
