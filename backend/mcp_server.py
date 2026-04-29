import asyncio
import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
import database

app = Server("period-tracker")

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="log_symptom",
            description="Log period symptoms for a given date",
            inputSchema={
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                    "symptoms": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of symptoms from: cramps, bloating, headache, fatigue, back_pain, mood_swings, nausea, breast_tenderness, acne, insomnia"
                    },
                    "flow_level": {
                        "type": "string",
                        "enum": ["none", "light", "medium", "heavy"],
                        "description": "Menstrual flow level"
                    },
                    "notes": {"type": "string", "description": "Optional free-text notes"}
                },
                "required": ["date", "symptoms"]
            }
        ),
        types.Tool(
            name="get_symptom_history",
            description="Retrieve symptom logs from the past N days",
            inputSchema={
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Number of days to look back (default 30)", "default": 30}
                }
            }
        ),
        types.Tool(
            name="get_cycle_summary",
            description="Get a summary of symptom patterns across the tracked cycle history",
            inputSchema={"type": "object", "properties": {}}
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    await database.init_db()

    if name == "log_symptom":
        await database.log_symptom(
            date=arguments["date"],
            symptoms=arguments.get("symptoms", []),
            flow_level=arguments.get("flow_level"),
            notes=arguments.get("notes"),
        )
        return [types.TextContent(type="text", text=f"Logged symptoms for {arguments['date']}.")]

    elif name == "get_symptom_history":
        days = arguments.get("days", 30)
        history = await database.get_symptom_history(days)
        return [types.TextContent(type="text", text=json.dumps(history, indent=2))]

    elif name == "get_cycle_summary":
        history = await database.get_symptom_history(90)
        if not history:
            return [types.TextContent(type="text", text="No data logged yet.")]

        symptom_counts: dict[str, int] = {}
        flow_counts: dict[str, int] = {}
        for entry in history:
            for s in entry["symptoms"]:
                symptom_counts[s] = symptom_counts.get(s, 0) + 1
            if entry["flow_level"]:
                flow_counts[entry["flow_level"]] = flow_counts.get(entry["flow_level"], 0) + 1

        top_symptoms = sorted(symptom_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        summary = {
            "total_days_logged": len(history),
            "top_symptoms": top_symptoms,
            "flow_distribution": flow_counts,
            "date_range": f"{history[-1]['date']} to {history[0]['date']}"
        }
        return [types.TextContent(type="text", text=json.dumps(summary, indent=2))]

    return [types.TextContent(type="text", text="Unknown tool")]

async def main():
    await database.init_db()
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
