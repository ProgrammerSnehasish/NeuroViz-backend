import { Request, Response, NextFunction } from "express";
import { NLPService } from "./nlp.service";

export const NLPController = {
  summarize: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body;
      const out = await NLPService.summarize(text);
      res.status(200).json({ success: true, data: out });
    } catch (err) {
      next(err);
    }
  },

  detect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body;
      const out = await NLPService.detectToxicity(text);
      res.status(200).json({ success: true, data: out });
    } catch (err) {
      next(err);
    }
  },

  sentiment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body;
      const out = await NLPService.sentiment(text);
      res.status(200).json({ success: true, data: out });
    } catch (err) {
      next(err);
    }
  },

  keywords: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body;
      const out = await NLPService.keywords(text);
      res.status(200).json({ success: true, data: out });
    } catch (err) {
      next(err);
    }
  },

  classify: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body;
      const out = await NLPService.classify(text);
      res.status(200).json({ success: true, data: out });
    } catch (err) {
      next(err);
    }
  },

  entities: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body;
      const out = await NLPService.entities(text);
      res.status(200).json({ success: true, data: out });
    } catch (err) {
      next(err);
    }
  }
};
