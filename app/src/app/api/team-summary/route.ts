import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const summaries = body.summaries;

    if (!Array.isArray(summaries) && typeof summaries !== "object") {
      return NextResponse.json(
        { error: "Summaries payload is required." },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "developer",
          content: `
You are an expert support QA manager assistant.

You are reviewing structured support coaching analytics across multiple chats from a SaaS support team.

Your job is to write a concise manager-facing weekly coaching summary.

Focus on:
- top team strengths
- most common coaching opportunities
- churn risk patterns
- which behaviors are repeating
- which agent(s) may need extra coaching attention
- what the manager should focus on next

Be practical, leadership-friendly, and concise.
Return only the requested JSON.
Do not include bullet characters, em dashes, or any special Unicode symbols in your text. Use only plain ASCII characters. The UI adds its own formatting.
          `.trim(),
        },
        {
          role: "user",
          content: `Structured team data:\n${JSON.stringify(summaries, null, 2)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "team_weekly_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              headline: { type: "string" },
              top_strengths: {
                type: "array",
                items: { type: "string" },
              },
              top_coaching_opportunities: {
                type: "array",
                items: { type: "string" },
              },
              risk_patterns: {
                type: "array",
                items: { type: "string" },
              },
              manager_focus_next: {
                type: "array",
                items: { type: "string" },
              },
              agents_needing_attention: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "headline",
              "top_strengths",
              "top_coaching_opportunities",
              "risk_patterns",
              "manager_focus_next",
              "agents_needing_attention",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No summary content returned." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({ result: parsed });
  } catch (error: any) {
    console.error("Team summary error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate team summary." },
      { status: 500 }
    );
  }
}