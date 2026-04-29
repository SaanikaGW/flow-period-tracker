"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Log } from "../page";

type Message = { role: "user" | "assistant"; content: string; time: string };

const SUGGESTIONS = [
  "Why do I get cramps?",
  "What helps with bloating?",
  "Is fatigue during my period normal?",
  "What does my symptom history show?",
];

function loadLogs(): Log[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("flow_logs") || "[]"); }
  catch { return []; }
}

function now() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your period health tutor. I can explain symptoms, suggest remedies, and look at your tracked data for personalized insights. What's on your mind?",
      time: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text, time: now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const history = updatedMessages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, symptomLogs: loadLogs().slice(0, 30) }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || data.detail || "Something went wrong.", time: now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again.", time: now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: "calc(100vh - 72px)" }}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-lg shadow-sm">
          🌸
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Period Health Tutor</h1>
          <p className="text-xs text-gray-400">Ask anything about your cycle, symptoms, or remedies</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col animate-fade-in ${msg.role === "user" ? "items-end" : "items-start"}`}
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                msg.role === "user"
                  ? "bg-rose-500 text-white rounded-br-md"
                  : "bg-white text-gray-800 border border-rose-100 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-sm flex-shrink-0">
              🌸
            </div>
            <div className="bg-white border border-rose-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full dot-1" />
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full dot-2" />
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full dot-3" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs bg-white border border-rose-200 text-rose-600 px-3 py-1.5 rounded-full hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end bg-white rounded-2xl border border-rose-200 shadow-sm px-4 py-3 focus-within:border-rose-400 focus-within:shadow-md transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your symptoms… (Enter to send)"
          rows={1}
          className="flex-1 text-sm text-gray-700 placeholder-gray-300 focus:outline-none resize-none bg-transparent leading-relaxed"
          style={{ maxHeight: "120px" }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="flex-shrink-0 w-8 h-8 bg-rose-500 hover:bg-rose-600 disabled:opacity-30 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
          aria-label="Send"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p className="text-center text-[10px] text-gray-300 mt-2">Shift+Enter for new line · Enter to send</p>
    </div>
  );
}
