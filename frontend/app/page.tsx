"use client";
import { useState, useEffect } from "react";

const SYMPTOMS = [
  { id: "cramps", label: "Cramps" },
  { id: "bloating", label: "Bloating" },
  { id: "headache", label: "Headache" },
  { id: "fatigue", label: "Fatigue" },
  { id: "back_pain", label: "Back Pain" },
  { id: "mood_swings", label: "Mood Swings" },
  { id: "nausea", label: "Nausea" },
  { id: "breast_tenderness", label: "Breast Tenderness" },
  { id: "acne", label: "Acne" },
  { id: "insomnia", label: "Insomnia" },
];

const FLOW_LEVELS = ["none", "light", "medium", "heavy"];

export type Log = {
  id: string;
  date: string;
  symptoms: string[];
  flow_level: string;
  notes: string;
};

function loadLogs(): Log[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("flow_logs") || "[]");
  } catch {
    return [];
  }
}

function saveLogs(logs: Log[]) {
  localStorage.setItem("flow_logs", JSON.stringify(logs));
}

export default function TrackerPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [flowLevel, setFlowLevel] = useState("none");
  const [notes, setNotes] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setLogs(loadLogs()); }, []);

  function toggleSymptom(id: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newLog: Log = {
      id: Date.now().toString(),
      date,
      symptoms: selectedSymptoms,
      flow_level: flowLevel,
      notes,
    };
    const updated = [newLog, ...logs].sort((a, b) => b.date.localeCompare(a.date));
    saveLogs(updated);
    setLogs(updated);
    setSelectedSymptoms([]);
    setNotes("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDelete(id: string) {
    const updated = logs.filter((l) => l.id !== id);
    saveLogs(updated);
    setLogs(updated);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Log Today&apos;s Symptoms</h1>
        <p className="text-sm text-gray-500 mt-1">Track how you&apos;re feeling each day.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSymptom(s.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedSymptoms.includes(s.id)
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Flow Level</label>
          <div className="flex gap-2">
            {FLOW_LEVELS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFlowLevel(f)}
                className={`px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${
                  flowLevel === f
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else you want to note..."
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
          />
        </div>

        <button
          type="submit"
          className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
        >
          {saved ? "Saved!" : "Log Symptoms"}
        </button>
      </form>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">History</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">No logs yet. Start tracking above.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-rose-100 px-5 py-4 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">{log.date}</p>
                  <div className="flex flex-wrap gap-1">
                    {log.symptoms.map((s) => (
                      <span key={s} className="bg-rose-50 text-rose-600 text-xs px-2 py-0.5 rounded-full capitalize">
                        {s.replace("_", " ")}
                      </span>
                    ))}
                    {log.flow_level && log.flow_level !== "none" && (
                      <span className="bg-pink-50 text-pink-600 text-xs px-2 py-0.5 rounded-full capitalize">
                        Flow: {log.flow_level}
                      </span>
                    )}
                  </div>
                  {log.notes && <p className="text-xs text-gray-400">{log.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="text-gray-300 hover:text-rose-400 text-xs ml-4 transition-colors"
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
