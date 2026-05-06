import { sql } from "@vercel/postgres";

export type SymptomLog = {
  id: number;
  date: string;
  symptoms: string[];
  flow_level: string | null;
  notes: string | null;
};

async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS symptom_logs (
      id         SERIAL PRIMARY KEY,
      date       TEXT NOT NULL,
      symptoms   TEXT NOT NULL,
      flow_level TEXT,
      notes      TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

function parseRow(r: Record<string, unknown>): SymptomLog {
  return {
    id: r.id as number,
    date: r.date as string,
    symptoms: JSON.parse(r.symptoms as string) as string[],
    flow_level: r.flow_level as string | null,
    notes: r.notes as string | null,
  };
}

export async function logSymptom(
  date: string,
  symptoms: string[],
  flowLevel: string | null,
  notes: string | null
) {
  await initDB();
  await sql`
    INSERT INTO symptom_logs (date, symptoms, flow_level, notes)
    VALUES (${date}, ${JSON.stringify(symptoms)}, ${flowLevel}, ${notes})
  `;
}

export async function getAllLogs(): Promise<SymptomLog[]> {
  await initDB();
  const { rows } = await sql`SELECT * FROM symptom_logs ORDER BY date DESC`;
  return rows.map(parseRow);
}

export async function getSymptomHistory(days = 30): Promise<SymptomLog[]> {
  await initDB();
  const { rows } = await sql`
    SELECT * FROM symptom_logs
    WHERE date::date >= CURRENT_DATE - (${days} || ' days')::INTERVAL
    ORDER BY date DESC
  `;
  return rows.map(parseRow);
}

export async function deleteLog(id: number) {
  await sql`DELETE FROM symptom_logs WHERE id = ${id}`;
}
