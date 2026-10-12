import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Owner (or admin) download of their own document: RLS-checked lookup, then a 60-second signed URL. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path, file_name").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
  if (!data?.signedUrl) return NextResponse.json({ error: "Not available" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
