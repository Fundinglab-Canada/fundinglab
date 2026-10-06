import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { webinarIcs } from "@/lib/webinar";

// Public calendar file for a session. Uses the public view, so it never contains the join link.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.from("webinar_sessions_public").select("id, starts_at, duration_minutes, topic").eq("id", id).maybeSingle();
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(webinarIcs(data), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="funding-lab-webinar.ics"' },
  });
}
