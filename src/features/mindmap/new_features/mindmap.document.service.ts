import path from "path";
import mammoth from "mammoth";
import { generateMindmap } from "../service/mindmap.ai.service";

const MIN_TEXT_LENGTH = 100;
const MAX_INPUT_CHARS = 3000;

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

    case ".doc":
      throw new Error(
        "Legacy .doc format is not supported. Please convert to .docx and retry."
      );

    default:
      throw new Error(
        `Unsupported document type: ${ext}. Supported: .txt, .md, .pdf, .docx`
      );
  }

  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length < MIN_TEXT_LENGTH) {
    throw new Error(
      `Document contains insufficient text (got ${cleaned.length} chars, need at least ${MIN_TEXT_LENGTH}).`
    );
  }

  const truncated =
    cleaned.length > MAX_INPUT_CHARS
      ? cleaned.slice(0, MAX_INPUT_CHARS) + "\n\n[...content truncated for processing...]"
      : cleaned;

  console.log(`[DOC] Extracted ${cleaned.length} chars from "${originalName}", sending ${truncated.length}`);
  console.log(`[DOC] Preview: ${truncated.slice(0, 200)}`);

  return generateMindmap(truncated);
}

async function extractPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const PDFParser = require("pdf2json");
    const parser = new PDFParser(null, 1);

    parser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const text = pdfData.Pages.map((page: any) =>
          page.Texts.map((t: any) =>
            decodeURIComponent(t.R.map((r: any) => r.T).join(""))
          ).join(" ")
        ).join("\n");
        resolve(text);
      } catch (err: any) {
        reject(new Error(`PDF parsing failed: ${err.message}`));
      }
    });

    parser.on("pdfParser_dataError", (err: any) => {
      reject(new Error(`PDF parsing error: ${err.parserError ?? err}`));
    });

    parser.parseBuffer(buffer);
  });
}

async function extractDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  } catch (err: any) {
    throw new Error(`Failed to extract text from DOCX: ${err.message}`);
  }
}