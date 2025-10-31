import { jsPDF } from "jspdf";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { createCanvas } from "canvas";
import os from "os";
import prisma from "../../../config/database";

const getSystemDownloadsDir = () => {
  const userHome = os.homedir();
  const downloadsDir = path.join(userHome, "Downloads");

  if (!existsSync(downloadsDir)) mkdirSync(downloadsDir, { recursive: true });

  return downloadsDir;
};

export const MindmapExportService = {
  async exportMindmapPDF(mindmapId: string) {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw new Error("Mindmap not found");

    const downloadDir = getSystemDownloadsDir();

    const doc = new jsPDF();
    doc.text(`Mindmap: ${mindmap.title}`, 10, 10);
    doc.text(`Description: ${mindmap.description || "No description"}`, 10, 20);
    doc.text("Structure:", 10, 30);
    doc.text(JSON.stringify(mindmap.structure, null, 2).slice(0, 400), 10, 40);

    const outputPath = path.join(downloadDir, `${mindmap.title || mindmapId}.pdf`);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    writeFileSync(outputPath, pdfBuffer);

    return outputPath;
  },

  async exportMindmapJPEG(mindmapId: string) {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw new Error("Mindmap not found");

    const downloadDir = getSystemDownloadsDir();

    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext("2d");

    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 600);

    ctx.fillStyle = "#000000";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`Mindmap: ${mindmap.title}`, 20, 50);
    ctx.font = "14px Arial";
    ctx.fillText(`Description: ${mindmap.description || ""}`, 20, 80);

    try {
      const structure = typeof mindmap.structure === "string"
        ? JSON.parse(mindmap.structure)
        : mindmap.structure;

      if (structure?.nodes?.length) {
        ctx.font = "12px Arial";
        let y = 120;
        for (const node of structure.nodes.slice(0, 10)) {
          ctx.fillText(`• ${node.label || node.text || "Node"}`, 30, y);
          y += 20;
        }
      }
    } catch {
      ctx.fillText("(Invalid mindmap structure)", 20, 120);
    }

    const outputPath = path.join(downloadDir, `${mindmap.title || mindmapId}.jpg`);
    const buffer = canvas.toBuffer("image/jpeg");
    writeFileSync(outputPath, buffer);

    return outputPath;
  },
};
