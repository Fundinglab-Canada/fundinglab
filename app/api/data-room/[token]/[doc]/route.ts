import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { watermarkPdf } from "@/lib/watermark";
import { rateLimit } from "@/lib/turnstile";

export const runtime = "nodejs";

/**
 * Data room file for an invited viewer. fl_data_room_file checks the token, expiry, revocation and download
 * permission, and logs the view; the file is streamed from private storage (viewers never get a storage URL).
 * PDFs are watermarked with the viewer's email and date unless the owner turned watermarking off.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string; doc: string }> }) {
  const { token, doc } = await params;
  const action = new URL(request.url).searchParams.get("download") === "1" ? "download" : "view";
  if (!/^[\w-]{20,64}$/.test(token) || !/^[0-9a-f-]{36}$/i.test(doc)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await rateLimit(`dr:${token}`, 60, 60_000))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const db = createAdminClient();
  const { data } = await db.rpc("fl_data_room_file", { p_token: token, p_document: doc, p_action: action });
  const file = (data ?? [])[0] as { storage_path: string; file_name: string; mime_type: string | null; viewer_email: string; watermark: boolean } | undefined;
  if (!file) return NextResponse.json({ error: action === "download" ? "Downloads aren't allowed for this link, or it has expired." : "This link has expired or was revoked." }, { status: 403 });

  const isPdf = file.mime_type === "application/pdf";
  if (action === "view" && !isPdf) return NextResponse.json({ error: "Preview is available for PDFs only." }, { status: 415 });
  const { data: blob, error } = await db.storage.from("documents").download(file.storage_path);
  if (error || !blob) return NextResponse.json({ error: "File unavailable" }, { status: 404 });

  let body: Uint8Array = new Uint8Array(await blob.arrayBuffer());
  if (isPdf && file.watermark) {
    const stamped = await watermarkPdf(body.buffer as ArrayBuffer, file.viewer_email);
    // Never serve an unwatermarked copy when watermarking is on.
    if (!stamped) return NextResponse.json({ error: "This PDF can't be previewed. Ask the owner for another copy." }, { status: 422 });
    body = stamped;
  }
  const name = file.file_name.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      "Content-Type": file.mime_type ?? "application/octet-stream",
      "Content-Disposition": `${action === "download" ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
