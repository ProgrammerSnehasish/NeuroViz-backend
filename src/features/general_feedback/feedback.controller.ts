import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import createHttpError from "http-errors";
import { FeedbackService } from "./feedback.service";
import { SubmitFeedbackDto, UpdateFeedbackStatusDto } from "./feedback.dto";

// ── Helpers ───────────────────────────────────────────────────────────────────

const getUserId = (req: Request): string =>
  (req.user as any)?.id ||
  (req.user as any)?.userId ||
  (req.user as any)?._id;

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

// ─────────────────────────────────────────────────────────────────────────────

export const FeedbackController = {

  // ── USER ───────────────────────────────────────────────────────────────────

  /** POST /feedback */
  submitFeedback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = await validateDto(SubmitFeedbackDto, req.body);
      const data = await FeedbackService.submitFeedback(body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /feedback/my */
  getMyFeedbacks: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await FeedbackService.getMyFeedbacks(getUserId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /feedback/my/:feedbackId */
  getMyFeedbackById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await FeedbackService.getMyFeedbackById(getUserId(req), req.params.feedbackId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /feedback/my/:feedbackId */
  deleteMyFeedback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await FeedbackService.deleteMyFeedback(getUserId(req), req.params.feedbackId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
};