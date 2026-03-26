import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: Request) {
  try {
    let body: { email?: unknown; company_name?: unknown; team_size?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    if (
      !isNonEmptyString(body.email) ||
      !isNonEmptyString(body.company_name) ||
      !isNonEmptyString(body.team_size)
    ) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("extension_waitlist").insert({
      email: body.email.trim().toLowerCase(),
      company_name: body.company_name.trim(),
      team_size: body.team_size.trim(),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "already_registered" }, { status: 409 });
      }
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}