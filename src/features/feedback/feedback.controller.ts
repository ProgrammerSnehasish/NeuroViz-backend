import { Request, Response, NextFunction } from "express";
import * as FeedbackService from "./feedback.service";
import createHttpError from "http-errors";

export const addFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const feedback = await FeedbackService.createFeedback(userId, req.body);
    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
};

export const getUserFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || (req.user as any)?.id;
    if (!userId) throw createHttpError(400, "userId required");

    const feedbacks = await FeedbackService.getFeedbackByUser(userId);
    res.status(200).json({ success: true, data: feedbacks });
  } catch (err) {
    next(err);
  }
};
