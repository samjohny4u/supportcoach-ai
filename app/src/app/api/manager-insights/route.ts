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
      temperature: 0.2,
      messages: [
        {
          role: "developer",
          content: `
You are an expert support QA coaching strategist.

You are reviewing structured support coaching analytics across multiple chats from a SaaS support team.

Your job is to generate manager-facing coaching intelligence that clearly answers:
- what is going wrong
- which agents need attention
- what patterns are repeating
- what the manager should focus on next

Rules:
- Be practical, specific, and leadership-friendly.
- Focus on coaching and management action, not generic commentary.
- Keep each item concise but meaningful.
- Do not use assistant language.
- Do not offer extra help.
- Return only the requested JSON.
          `.trim(),
        },
        {
          role: "user",
          content: `Structured coaching data:\n${JSON.stringify(summaries, null, 2)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "manager_coaching_insights",
          strict: true,
          schema: {
            type: "object",
            properties: {
              headline: { type: "string" },
              what_is_going_wrong: {
                type: "array",
                items: { type: "string" },
              },
              repeating_patterns: {
                type: "array",
                items: { type: "string" },
              },
              agents_needing_attention: {
                type: "array",
                items: { type: "string" },
              },
              manager_focus_next: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "headline",
              "what_is_going_wrong",
              "repeating_patterns",
              "agents_needing_attention",
              "manager_focus_next",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No manager insights content returned." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({ result: parsed });
  } catch (error: any) {
    console.error("Manager insights error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to generate manager insights." },
      { status: 500 }
    );
  }
}