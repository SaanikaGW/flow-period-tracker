import { sql } from "@vercel/postgres";

type SymptomLog = {
  id: number;
  date: string;
  symptoms: string[];
  flow_level: string | null;
  notes: string | null;
};

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS symptom_logs (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      flow_level TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
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
  return rows.map((r) => ({ ...r, symptoms: JSON.parse(r.symptoms) } as SymptomLog));
}

export async function getSymptomHistory(days: number = 30): Promise<SymptomLog[]> {
  await initDB();
  const { rows } = await sql`
    SELECT * FROM symptom_logs
    WHERE date >= (CURRENT_DATE - ${days} * INTERVAL '1 day')::TEXT
    ORDER BY date DESC
  `;
  return rows.map((r) => ({ ...r, symptoms: JSON.parse(r.symptoms) } as SymptomLog));
}

export async function deleteLog(id: number) {
  await sql`DELETE FROM symptom_logs WHERE id = ${id}`;
}

export async function getCycleSummary() {
  const history = await getSymptomHistory(90);
  if (!history.length) return null;

  const symptomCounts: Record<string, number> = {};
  const flowCounts: Record<string, number> = {};

  for (const entry of history) {
    for (const s of entry.symptoms) {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    }
    if (entry.flow_level) {
      flowCounts[entry.flow_level] = (flowCounts[entry.flow_level] || 0) + 1;
    }
  }

  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    total_days_logged: history.length,
    top_symptoms: topSymptoms,
    flow_distribution: flowCounts,
    date_range: `${history[history.length - 1].date} to ${history[0].date}`,
  };
}
