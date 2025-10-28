import { Request, Response, NextFunction } from "express";
import * as FeedbackService from "./feedback.service";
import createHttpError from "http-errors";

export const addFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId =
      (req.user as any)?.userId || (req.user as any)?.id || (req.user as any)?.sub;

    if (!userId) throw createHttpError(401, "Unauthorized");

    const feedback = await FeedbackService.createFeedback(userId, req.body);
    if (!feedback) throw createHttpError(500, "Could not submit feedback");
    res.status(201).json({
      success: true,
      data: feedback,
    });
  } catch (err) {
    next(err);
  }
};


export const getUserFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || (req.user as any)?.id;
    if (!userId) throw createHttpError(400, "userId required");
    if (userId !== (req.user as any)?.userId && userId !== (req.user as any)?.id && userId !== (req.user as any)?.sub){
      throw createHttpError(401, "User not found or authorized.");
    }
    const feedbacks = await FeedbackService.getFeedbackByUser(userId);
    res.status(200).json({ success: true, data: feedbacks });
  } catch (err) {
    next(err);
  }
};
