import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

/** Stamps every page with the viewer's email and the date (data room previews, §7.5). Returns null if the PDF can't be parsed. */
export async function watermarkPdf(bytes: ArrayBuffer, email: string, when = new Date()): Promise<Uint8Array | null> {
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const label = `${email} · ${when.toISOString().slice(0, 10)} · Confidential`;
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      const size = Math.max(10, Math.min(width, height) / 28);
      const textWidth = font.widthOfTextAtSize(label, size);
      // Diagonal across the middle, plus a footer line.
      page.drawText(label, {
        x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 6), y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 6),
        size, font, color: rgb(0.45, 0.5, 0.58), opacity: 0.22, rotate: degrees(30),
      });
      page.drawText(label, { x: 24, y: 14, size: 8, font, color: rgb(0.45, 0.5, 0.58), opacity: 0.8 });
    }
    return await pdf.save();
  } catch {
    return null;
  }
}
