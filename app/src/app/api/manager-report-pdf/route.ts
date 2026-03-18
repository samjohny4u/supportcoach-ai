import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getCurrentOrganization } from "@/lib/currentOrganization";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ChatAnalysis = {
  id: number;
  file_name: string;
  agent_name: string | null;
  customer_name: string | null;
  chat_type: string | null;
  issue_summary: string | null;
  empathy: number | null;
  clarity: number | null;
  ownership: number | null;
  resolution_quality: number | null;
  professionalism: number | null;
  churn_risk: string | null;
  deleted_message: boolean | null;
  missed_confirmation: boolean | null;
  premature_close: boolean | null;
  product_limitation_chat: boolean | null;
  customer_frustration_present: boolean | null;
  escalation_done_well: boolean | null;
  summary_strengths: string[] | null;
  summary_improvements: string[] | null;
  created_at: string;
  organization_id?: string | null;
};

function wrapText(text: string, maxChars = 90) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function sanitizeReportText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^If helpful, I can also.*$/gim, "")
    .replace(/^Let me know if.*$/gim, "")
    .replace(/^I can also.*$/gim, "")
    .trim();
}

async function generateManagerReport(
  organizationId: string,
  agent: string,
  days: string
) {
  const date = new Date();
  date.setDate(date.getDate() - Number(days));

  let query = supabase
    .from("chat_analyses")
    .select("*")
    .eq("organization_id", organizationId)
    .neq("excluded", true)
    .gte("created_at", date.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  if (agent && agent !== "all") {
    query = query.eq("agent_name", agent);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load data: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return "No analyzed chats found for this filter selection.";
  }

  const trimmedDataset = (data as ChatAnalysis[]).slice(0, 75);

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `
You are writing a finished internal management report for a support leadership team.

You are NOT a chatbot.
You are NOT an assistant.
You are producing a polished weekly coaching report.

Use this structure:

## Weekly Support Coaching Report
### Team Health
### Top Strengths
### Top Coaching Opportunities
### Risk Patterns
### Agents Needing Attention
### Manager Focus Next

Rules:
- Write for managers and leadership.
- Do not use assistant language.
- Do not offer extra help.
- Do not say "If helpful, I can..."
- No closing paragraph after Manager Focus Next.
- Manager Focus Next must contain 3–5 specific coaching actions.
        `.trim(),
      },
      {
        role: "user",
        content: `
Dataset for analysis:

${JSON.stringify(trimmedDataset, null, 2)}
        `.trim(),
      },
    ],
  });

  const rawReport =
    completion.choices[0]?.message?.content || "Report generation failed.";

  return sanitizeReportText(rawReport);
}

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response("Not authenticated.", { status: 401 });
    }

    const { organizationId } = await getCurrentOrganization();

    if (!organizationId) {
      return new Response("Organization not found.", { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const agent = searchParams.get("agent") || "all";
    const days = searchParams.get("days") || "7";

    const report = await generateManagerReport(organizationId, agent, days);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 50;
    const lineHeight = 18;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawLine = (
      text: string,
      opts?: { bold?: boolean; size?: number }
    ) => {
      const usedFont = opts?.bold ? boldFont : font;
      const size = opts?.size ?? 11;

      if (y < margin + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      page.drawText(text, {
        x: margin,
        y,
        size,
        font: usedFont,
        color: rgb(0, 0, 0),
        maxWidth: pageWidth - margin * 2,
      });

      y -= lineHeight;
    };

    const lines = report.split("\n").map((l: string) => l.trim());

    for (const rawLine of lines) {
      if (!rawLine) {
        y -= 8;
        continue;
      }

      if (rawLine.startsWith("## ")) {
        y -= 6;
        drawLine(rawLine.replace(/^##\s+/, ""), { bold: true, size: 20 });
        y -= 6;
        continue;
      }

      if (rawLine.startsWith("### ")) {
        y -= 4;
        drawLine(rawLine.replace(/^###\s+/, ""), { bold: true, size: 14 });
        continue;
      }

      if (rawLine.startsWith("- ")) {
        const bullet = rawLine.replace(/^- /, "");
        const wrapped = wrapText(`• ${bullet}`);

        for (const line of wrapped) {
          drawLine(line);
        }

        continue;
      }

      const wrapped = wrapText(rawLine);

      for (const line of wrapped) {
        drawLine(line);
      }
    }

    const pdfBytes = await pdfDoc.save();

    const safeAgent =
      agent === "all" ? "all-agents" : agent.replace(/\s+/g, "-").toLowerCase();
    const fileName = `weekly-support-coaching-report-${safeAgent}-${days}d.pdf`;

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Manager report PDF route error:", error);

    return new Response(
      error?.message || "Failed to generate manager report PDF.",
      { status: 500 }
    );
  }
}