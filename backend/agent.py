import os
import json
import asyncio
from anthropic import Anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

client = Anthropic(api_key=os.environ.get("OPEN_API_KEY"))

SYSTEM_PROMPT = """You are a knowledgeable, warm, and non-judgmental period health assistant.
You help users understand their menstrual symptoms, explain why they happen, and suggest evidence-based remedies.

You have access to the user's symptom tracker data via tools. Use this data to personalize your responses —
reference patterns you notice (e.g., "I see you've logged cramps frequently") to make your guidance more relevant.

When explaining symptoms:
- Explain the biological reason behind each symptom clearly and simply
- Suggest practical, evidence-based remedies (heat therapy, diet, OTC medications, lifestyle changes)
- Flag symptoms that may warrant a doctor visit (very heavy bleeding, severe pain, unusual patterns)
- Be warm, empathetic, and never make the user feel embarrassed

You can also log symptoms on behalf of the user if they mention what they're experiencing today."""

async def run_agent(user_message: str, conversation_history: list[dict]) -> str:
    server_params = StdioServerParameters(
        command="python3.11",
        args=["mcp_server.py"],
        cwd=os.path.dirname(os.path.abspath(__file__))
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            mcp_tools = await session.list_tools()
            tools = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema,
                }
                for tool in mcp_tools.tools
            ]

            messages = conversation_history + [{"role": "user", "content": user_message}]

            while True:
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=1024,
                    system=SYSTEM_PROMPT,
                    tools=tools,
                    messages=messages,
                )

                if response.stop_reason == "end_turn":
                    for block in response.content:
                        if hasattr(block, "text"):
                            return block.text
                    return ""

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = await session.call_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result.content[0].text if result.content else "",
                        })

                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
