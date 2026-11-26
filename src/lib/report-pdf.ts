import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PdfReport = {
  studentName: string;
  course: string;
  university: string;
  completedAt: string;
  mode: string;
  partial: boolean;
  overall: number | null;
  band: string | null;
  bandWithheld: boolean;
  categories: Array<{ label: string; score: number }>;
  summary: string;
  answers: Array<{
    position: number;
    prompt: string;
    score: number | null;
    transcript: string;
    improvements: string[];
  }>;
};

export function pdfSafe(text: string): string {
  return text
    .replace(/£/g, "GBP ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "");
}

export async function buildReportPdf(report: PdfReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensure = (needed: number) => {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const draw = (text: string, size: number, weight: "regular" | "bold" = "regular", colour = rgb(0.09, 0.13, 0.2)) => {
    const face = weight === "bold" ? bold : font;
    const lines = wrap(pdfSafe(text), face, size, pageWidth - margin * 2);
    for (const line of lines) {
      ensure(size + 6);
      page.drawText(line, { x: margin, y: y - size, size, font: face, color: colour });
      y -= size + 4;
    }
  };

  draw("CAS Ready", 20, "bold");
  draw("Practice interview report", 12, "regular", rgb(0.35, 0.32, 0.28));
  y -= 8;
  draw(
    "Practice only. This report does not predict or guarantee a CAS, a visa, or a university decision.",
    10,
    "bold",
  );
  y -= 8;
  draw(`${report.studentName || "Student"} · ${report.university || "University not set"}`, 11, "bold");
  draw(report.course || "Course not set", 11);
  draw(`${report.completedAt} · ${report.mode}${report.partial ? " · partial result" : ""}`, 10, "regular", rgb(0.35, 0.32, 0.28));
  y -= 8;
  draw(
    report.overall == null ? "Overall: not scored" : `Overall practice score: ${report.overall}`,
    14,
    "bold",
  );
  if (report.band) draw(`Band: ${report.band}`, 12, "bold");
  if (report.bandWithheld) {
    draw("A readiness band is withheld because too few answers had text to score for content.", 10);
  }
  y -= 6;
  for (const category of report.categories) {
    draw(`${category.label}: ${category.score}`, 11);
  }
  y -= 8;
  if (report.summary) {
    draw("Summary", 13, "bold");
    draw(report.summary, 11);
    y -= 6;
  }
  draw("Answers", 13, "bold");
  for (const answer of report.answers) {
    y -= 4;
    draw(`${answer.position}. ${answer.prompt}`, 11, "bold");
    draw(answer.score == null ? "Score: not available" : `Score: ${answer.score}`, 10);
    draw(answer.transcript ? `What was said: ${answer.transcript}` : "No transcript was stored for this answer.", 10);
    for (const note of answer.improvements) draw(`Next: ${note}`, 10);
  }
  y -= 12;
  draw(
    "CAS Ready is an independent practice tool. It is not the University, UKVI, or the Enroly CAS Shield interview. Recordings and transcripts are deleted on the retention schedule, or sooner if you delete your account.",
    9,
    "regular",
    rgb(0.35, 0.32, 0.28),
  );

  return doc.save();
}

function wrap(text: string, font: { widthOfTextAtSize: (value: string, size: number) => number }, size: number, width: number): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length > 0 ? lines : [""];
}
