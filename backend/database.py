import aiosqlite
import json
from datetime import datetime

DB_PATH = "period_tracker.db"

SYMPTOM_OPTIONS = [
    "cramps", "bloating", "headache", "fatigue", "back_pain",
    "mood_swings", "nausea", "breast_tenderness", "acne", "insomnia"
]

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS symptom_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                symptoms TEXT NOT NULL,
                flow_level TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cycle_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                event_type TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()

async def log_symptom(date: str, symptoms: list[str], flow_level: str | None, notes: str | None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO symptom_logs (date, symptoms, flow_level, notes) VALUES (?, ?, ?, ?)",
            (date, json.dumps(symptoms), flow_level, notes)
        )
        await db.commit()

async def get_symptom_history(days: int = 30) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT * FROM symptom_logs
               WHERE date >= date('now', ?)
               ORDER BY date DESC""",
            (f"-{days} days",)
        )
        rows = await cursor.fetchall()
        return [
            {
                "id": r["id"],
                "date": r["date"],
                "symptoms": json.loads(r["symptoms"]),
                "flow_level": r["flow_level"],
                "notes": r["notes"],
            }
            for r in rows
        ]

async def get_all_logs() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM symptom_logs ORDER BY date DESC")
        rows = await cursor.fetchall()
        return [
            {
                "id": r["id"],
                "date": r["date"],
                "symptoms": json.loads(r["symptoms"]),
                "flow_level": r["flow_level"],
                "notes": r["notes"],
            }
            for r in rows
        ]

async def delete_log(log_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM symptom_logs WHERE id = ?", (log_id,))
        await db.commit()
