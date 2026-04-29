import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import Optional
import database
import agent

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SymptomLog(BaseModel):
    date: str
    symptoms: list[str]
    flow_level: Optional[str] = None
    notes: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    history: list[dict] = []

@app.get("/api/symptoms")
async def get_symptoms():
    return await database.get_all_logs()

@app.post("/api/symptoms")
async def create_symptom_log(log: SymptomLog):
    await database.log_symptom(log.date, log.symptoms, log.flow_level, log.notes)
    return {"status": "ok"}

@app.delete("/api/symptoms/{log_id}")
async def delete_symptom_log(log_id: int):
    await database.delete_log(log_id)
    return {"status": "ok"}

@app.post("/api/chat")
async def chat(msg: ChatMessage):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")
    reply = await agent.run_agent(msg.message, msg.history)
    return {"reply": reply}
