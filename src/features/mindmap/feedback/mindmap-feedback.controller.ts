import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import createHttpError from "http-errors";
import { MindmapFeedbackService } from "./mindmap-feedback.service";
import { GiveMindmapFeedbackDto, UpdateMindmapFeedbackDto } from "./mindmap-feedback.dto";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function validateDto<T extends object>(DtoClass: new () => T, body: any): Promise<T> {
  const instance = plainToInstance(DtoClass, body, { excludeExtraneousValues: true });
  const errors = await validate(instance);
  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(", "))
      .join("; ");
    throw createHttpError(400, messages);
  }
  return instance;
}

// userId injected by enforceTeacherOrStudent middleware via res.locals
const getUserId = (res: Response): string => res.locals.userId;

// ─────────────────────────────────────────────────────────────────────────────

export const MindmapFeedbackController = {

  /** POST /mindmap/feedback */
  giveFeedback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = await validateDto(GiveMindmapFeedbackDto, req.body);
      const data = await MindmapFeedbackService.giveFeedback(getUserId(res), body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /mindmap/feedback/my */
  getMyFeedbacks: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await MindmapFeedbackService.getMyFeedbacks(getUserId(res));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /mindmap/feedback/:mapId/all */
  getFeedbacksForMindmap: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await MindmapFeedbackService.getFeedbacksForMindmap(req.params.mapId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /mindmap/feedback/:mapId/my */
  getMyFeedbackForMindmap: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await MindmapFeedbackService.getMyFeedbackForMindmap(getUserId(res), req.params.mapId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /mindmap/feedback/:feedbackId */
  updateFeedback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = await validateDto(UpdateMindmapFeedbackDto, req.body);
      const data = await MindmapFeedbackService.updateFeedback(getUserId(res), req.params.feedbackId as string, body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /mindmap/feedback/:feedbackId */
  deleteFeedback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await MindmapFeedbackService.deleteFeedback(getUserId(res), req.params.feedbackId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};