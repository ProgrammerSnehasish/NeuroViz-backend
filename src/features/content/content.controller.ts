import { Request, Response, NextFunction } from "express";
import { summarizeText } from "./content.service";

export const summarize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, maxSentences } = req.body;
    if (!text) {
        res.status(400).json({ success: false, message: "text required" });
        return;
    }
         
    const summary = summarizeText(text, Number(maxSentences) || 3);
    res.status(200).json({ success: true, summary });
  } catch (err) {
    next(err);
  }
};
