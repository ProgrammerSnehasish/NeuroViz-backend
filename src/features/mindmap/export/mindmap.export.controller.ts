import { Request, Response, NextFunction } from "express";
import { MindmapExportService } from "./mindmap.export.service";

export const MindmapExportController = {
  async downloadPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const filePath = await MindmapExportService.exportMindmapPDF(req.params.id);
      res.download(filePath);
    } catch (err) {
      next(err);
    }
  },

  async downloadJPEG(req: Request, res: Response, next: NextFunction) {
    try {
      const filePath = await MindmapExportService.exportMindmapJPEG(req.params.id);
      res.download(filePath);
    } catch (err) {
      next(err);
    }
  },
};