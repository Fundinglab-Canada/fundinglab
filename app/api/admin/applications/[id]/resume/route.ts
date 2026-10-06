import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Short-lived signed URL to a resume or cover letter. Admins only (checked here and by storage RLS).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: app } = await supabase.from("job_applications").select("resume_path, cover_letter_path").eq("id", id).maybeSingle();
  const which = new URL(req.url).searchParams.get("file") === "cover" ? app?.cover_letter_path : app?.resume_path;
  if (!which) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data } = await createAdminClient().storage.from("careers").createSignedUrl(which, 300);
  if (!data?.signedUrl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
