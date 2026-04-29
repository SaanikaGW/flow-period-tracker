"use client";
import { useState, useRef, useEffect } from "react";
import type { Log } from "../page";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why do I get cramps?",
  "What helps with bloating?",
  "Is it normal to feel so tired?",
  "What does my symptom history show?",
];

function loadLogs(): Log[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("flow_logs") || "[]");
  } catch {
    return [];
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your period health tutor. I can explain your symptoms, suggest remedies, and look at your tracked data to give you personalized insights. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const history = updatedMessages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          symptomLogs: loadLogs().slice(0, 30),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || data.detail || "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Period Health Tutor</h1>
        <p className="text-sm text-gray-500 mt-1">Ask anything about your cycle, symptoms, or remedies.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-rose-500 text-white rounded-br-sm"
                  : "bg-white text-gray-700 border border-rose-100 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-rose-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs bg-white border border-rose-100 text-rose-500 px-3 py-1.5 rounded-full hover:bg-rose-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
        className="flex gap-2 mt-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your symptoms..."
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
