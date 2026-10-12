import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DATA_ROOM_FOLDERS, folderLabel } from "@/lib/prep";
import { dateShort } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Data room", robots: { index: false, follow: false } };

type Room = {
  status: "ok" | "invalid" | "expired";
  business_name?: string; email?: string; expires_at?: string; can_download?: boolean; watermark?: boolean;
  documents?: { id: string; folder: string; file_name: string; mime_type: string | null; size_bytes: number | null; version: number; created_at: string }[];
};

/** Invited viewer's data room (§7.5). No sign-in: the emailed token is the key, and it expires. */
export default async function DataRoomViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = /^[\w-]{20,64}$/.test(token) ? await supabase.rpc("fl_data_room_open", { p_token: token }) : { data: null };
  const room = (data ?? { status: "invalid" }) as Room;

  if (room.status !== "ok") {
    return (
      <section className="container flex max-w-xl flex-col gap-3 py-20 text-center">
        <h1 className="text-3xl font-bold">{room.status === "expired" ? "This invitation has expired" : "This link isn't valid"}</h1>
        <p className="text-subtle">Ask the company that shared it for a new invitation.</p>
      </section>
    );
  }
  const docs = room.documents ?? [];
  const folders = [...DATA_ROOM_FOLDERS.map((f) => f.id), "other"].filter((f) => docs.some((d) => d.folder === f));

  return (
    <section className="container flex max-w-4xl flex-col gap-6 py-10">
      <div>
        <span className="eyebrow">Confidential data room</span>
        <h1 className="mt-1 text-3xl font-bold">{room.business_name}</h1>
        <p className="text-subtle">
          Shared with <b className="text-ink">{room.email}</b> until {dateShort(room.expires_at)}. {room.can_download ? "You can view and download files." : "View only."}
          {room.watermark ? " PDFs are watermarked with your email and today's date." : ""} Your views are shared with the company.
        </p>
      </div>
      {docs.length === 0 && <p className="card text-subtle">No documents yet.</p>}
      {folders.map((f) => (
        <div key={f} className="card flex flex-col gap-2">
          <h2 className="text-lg font-bold">{folderLabel(f)}</h2>
          <ul className="flex flex-col divide-y divide-line">
            {docs.filter((d) => d.folder === f).map((d) => {
              const pdf = d.mime_type === "application/pdf";
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span><b className="text-ink">{d.file_name}</b>{d.version > 1 && <span className="pill ml-2">v{d.version}</span>}<span className="block text-[12px] text-subtle">Updated {dateShort(d.created_at)}</span></span>
                  <span className="flex gap-2">
                    {pdf && <a href={`/api/data-room/${token}/${d.id}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Preview</a>}
                    {room.can_download && <a href={`/api/data-room/${token}/${d.id}?download=1`} className="btn-ghost btn-sm">Download</a>}
                    {!pdf && !room.can_download && <span className="text-[12px] text-subtle">Download not permitted</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-[13px] text-subtle">Hosted by Funding Lab. Documents are confidential and shared only with you; please don&apos;t forward them.</p>
    </section>
  );
}
