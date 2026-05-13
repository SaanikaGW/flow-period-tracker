import { sql } from "@vercel/postgres";

export type SymptomLog = {
  id: number;
  user_id: string;
  date: string;
  symptoms: string[];
  flow_level: string | null;
  notes: string | null;
};

export type CycleEvent = {
  id: number;
  user_id: string;
  event_type: "period_start" | "period_end";
  date: string;
};

async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS symptom_logs (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL DEFAULT 'legacy',
      date       TEXT NOT NULL,
      symptoms   TEXT NOT NULL,
      flow_level TEXT,
      notes      TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`ALTER TABLE symptom_logs ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'legacy'`;
  await sql`
    CREATE TABLE IF NOT EXISTS cycle_events (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,
      event_type TEXT NOT NULL,
      date       TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

function parseLog(r: Record<string, unknown>): SymptomLog {
  return {
    id: r.id as number,
    user_id: r.user_id as string,
    date: r.date as string,
    symptoms: JSON.parse(r.symptoms as string) as string[],
    flow_level: r.flow_level as string | null,
    notes: r.notes as string | null,
  };
}

function parseCycleEvent(r: Record<string, unknown>): CycleEvent {
  return {
    id: r.id as number,
    user_id: r.user_id as string,
    event_type: r.event_type as "period_start" | "period_end",
    date: r.date as string,
  };
}

export async function logSymptom(
  userId: string,
  date: string,
  symptoms: string[],
  flowLevel: string | null,
  notes: string | null
) {
  await initDB();
  await sql`
    INSERT INTO symptom_logs (user_id, date, symptoms, flow_level, notes)
    VALUES (${userId}, ${date}, ${JSON.stringify(symptoms)}, ${flowLevel}, ${notes})
  `;
}

export async function getAllLogs(userId: string): Promise<SymptomLog[]> {
  await initDB();
  const { rows } = await sql`
    SELECT * FROM symptom_logs WHERE user_id = ${userId} ORDER BY date DESC
  `;
  return rows.map(parseLog);
}

export async function deleteLog(id: number, userId: string) {
  await sql`DELETE FROM symptom_logs WHERE id = ${id} AND user_id = ${userId}`;
}

export async function addCycleEvent(
  userId: string,
  eventType: "period_start" | "period_end",
  date: string
) {
  await initDB();
  await sql`DELETE FROM cycle_events WHERE user_id = ${userId} AND event_type = ${eventType} AND date = ${date}`;
  const { rows } = await sql`
    INSERT INTO cycle_events (user_id, event_type, date)
    VALUES (${userId}, ${eventType}, ${date})
    RETURNING *
  `;
  return parseCycleEvent(rows[0]);
}

export async function getCycleEvents(userId: string): Promise<CycleEvent[]> {
  await initDB();
  const { rows } = await sql`
    SELECT * FROM cycle_events WHERE user_id = ${userId} ORDER BY date DESC
  `;
  return rows.map(parseCycleEvent);
}

export async function deleteCycleEvent(id: number, userId: string) {
  await sql`DELETE FROM cycle_events WHERE id = ${id} AND user_id = ${userId}`;
}
