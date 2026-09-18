import { NextRequest, NextResponse } from "next/server";
import { proposeCvFields } from "@/lib/cv-parse";

export const runtime = "nodejs";

async function fileText(file: File) {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text || "";
  }
  return buffer.toString("utf8");
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  let extractedText = "";
  try {
    extractedText = await fileText(file);
  } catch {
    extractedText = "";
  }
  const fields = proposeCvFields(file.name, extractedText);
  return NextResponse.json({
    fileName: file.name,
    extractedText,
    fields,
  });
}
