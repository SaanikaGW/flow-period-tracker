import Database from "better-sqlite3";
import path from "path";

type Row = {
  id: number;
  date: string;
  symptoms: string;
  flow_level: string | null;
  notes: string | null;
};

export type SymptomLog = {
  id: number;
  date: string;
  symptoms: string[];
  flow_level: string | null;
  notes: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _db: Database.Database | undefined;
}

const db =
  globalThis._db ??
  new Database(path.join(process.cwd(), "period_tracker.db"));

if (process.env.NODE_ENV !== "production") globalThis._db = db;

db.exec(`
  CREATE TABLE IF NOT EXISTS symptom_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    symptoms   TEXT NOT NULL,
    flow_level TEXT,
    notes      TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

function parseRow(r: Row): SymptomLog {
  return {
    id: r.id,
    date: r.date,
    symptoms: JSON.parse(r.symptoms) as string[],
    flow_level: r.flow_level,
    notes: r.notes,
  };
}

export function logSymptom(
  date: string,
  symptoms: string[],
  flowLevel: string | null,
  notes: string | null
) {
  db.prepare(
    "INSERT INTO symptom_logs (date, symptoms, flow_level, notes) VALUES (?, ?, ?, ?)"
  ).run(date, JSON.stringify(symptoms), flowLevel, notes);
}

export function getAllLogs(): SymptomLog[] {
  return (
    db.prepare("SELECT * FROM symptom_logs ORDER BY date DESC").all() as Row[]
  ).map(parseRow);
}

export function getSymptomHistory(days = 30): SymptomLog[] {
  return (
    db
      .prepare(
        "SELECT * FROM symptom_logs WHERE date >= date('now', ?) ORDER BY date DESC"
      )
      .all(`-${days} days`) as Row[]
  ).map(parseRow);
}

export function deleteLog(id: number) {
  db.prepare("DELETE FROM symptom_logs WHERE id = ?").run(id);
}
