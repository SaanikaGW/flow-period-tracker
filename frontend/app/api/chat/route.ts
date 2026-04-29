import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  const client = new OpenAI({ apiKey: process.env.OPEN_API_KEY });
  const { message, history, symptomLogs } = await req.json();

  const contextSummary =
    symptomLogs && symptomLogs.length > 0
      ? `The user has logged the following symptoms:\n${symptomLogs
          .map(
            (l: { date: string; symptoms: string[]; flow_level: string; notes: string }) =>
              `- ${l.date}: ${l.symptoms.join(", ")}${l.flow_level && l.flow_level !== "none" ? `, flow: ${l.flow_level}` : ""}${l.notes ? `, notes: ${l.notes}` : ""}`
          )
          .join("\n")}`
      : "The user has not logged any symptoms yet.";

  const systemPrompt = `You are a knowledgeable, warm, and non-judgmental period health assistant.
You help users understand their menstrual symptoms, explain why they happen, and suggest evidence-based remedies.

${contextSummary}

When explaining symptoms:
- Explain the biological reason clearly and simply
- Suggest practical, evidence-based remedies (heat therapy, diet, OTC medications, lifestyle changes)
- Reference the user's logged symptoms when relevant to personalize your response
- Flag symptoms that may warrant a doctor visit (very heavy bleeding, severe pain, unusual patterns)
- Be warm, empathetic, and never make the user feel embarrassed`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 1024,
  });

  const reply = response.choices[0]?.message?.content ?? "";
  return NextResponse.json({ reply });
}
