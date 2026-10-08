// Team AI summary generation (Task 32). This was previously the body of
// POST /api/team-summary, which the dashboard called via a server-to-server
// self-fetch through NEXT_PUBLIC_SITE_URL — an unauthenticated public
// endpoint (open OpenAI spend) and a fragile hop that silently broke
// production when the env var was missing. The dashboard now calls this
// function directly and the route is gone.
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTeamSummary(payload: unknown): Promise<unknown | null> {
  try {
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
          content: `Structured team data:\n${JSON.stringify(payload, null, 2)}`,
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
      return null;
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Team summary generation error:", error);
    return null;
  }
}
