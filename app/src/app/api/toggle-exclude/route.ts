import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const analysisId = formData.get("analysis_id")?.toString();
    const excludedValue = formData.get("excluded")?.toString();
    const returnTo = formData.get("return_to")?.toString() || "/dashboard";

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysis_id is required." },
        { status: 400 }
      );
    }

    const excluded = excludedValue === "true";

    const { error } = await supabase
      .from("chat_analyses")
      .update({ excluded })
      .eq("id", analysisId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL(returnTo, req.url));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}