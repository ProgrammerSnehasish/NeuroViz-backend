import path from "path";
import { generateMindmap } from "../mindmap.ai.service";


const MIN_TEXT_LENGTH = 100; // raised from 20 — more meaningful threshold

export async function documentToMindmap(
  fileBuffer: Buffer,
  originalName: string,
  title: string
): Promise<any> {
  const ext = path.extname(originalName).toLowerCase();
  let text = "";

  switch (ext) {
    case ".txt":
    case ".md":
      text = fileBuffer.toString("utf-8");
      break;

    case ".pdf":
      text = await extractPDF(fileBuffer);
      break;

    case ".docx":
      text = await extractDOCX(fileBuffer);
      break;

    default:
      throw new Error(
        `Unsupported document type: ${ext}. Supported: .txt, .md, .pdf, .docx`
      );
  }

  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length < MIN_TEXT_LENGTH) {
    throw new Error(
      `Document contains insufficient text for mindmap generation (got ${cleaned.length} chars, need at least ${MIN_TEXT_LENGTH}).`
    );
  }

  return generateMindmap(title, cleaned);
}

async function extractPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse").then((m) => m.default ?? m);
    const data = await (pdfParse as any)(buffer);
    return data.text ?? "";
  } catch (err) {
    throw new Error(
      `Failed to extract text from PDF: ${(err as Error).message}. Ensure pdf-parse is installed.`
    );
  }
}

async function extractDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  } catch (err) {
    throw new Error(
      `Failed to extract text from DOCX: ${(err as Error).message}. Ensure mammoth is installed.`
    );
  }
}