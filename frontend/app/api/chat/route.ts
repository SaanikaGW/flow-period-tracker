import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.OPEN_API_KEY });

export async function POST(req: Request) {
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

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: message },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const text = response.content.find((b) => b.type === "text");
  return NextResponse.json({ reply: text?.type === "text" ? text.text : "" });
}
