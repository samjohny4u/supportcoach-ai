import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();

  await supabase.auth.signOut();

  // 303 (See Other) makes the browser follow the redirect with GET. The
  // default 307 preserves the logout form's POST, and POSTing to /login (a
  // page with no POST handler) dead-ends in HTTP 405. Basing the URL on the
  // incoming request keeps the user on the host they were browsing.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}