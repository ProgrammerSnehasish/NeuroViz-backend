import { Request, Response, NextFunction } from "express";
import * as EmotionService from "./emotion.service";
import createHttpError from "http-errors";

export const addEmotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId =
      (req.user as any)?.userId || (req.user as any)?.id || (req.user as any)?.sub;

    if (!userId) throw createHttpError(401, "Unauthorized");

    const emotion = await EmotionService.logEmotion(userId, req.body);

    res.status(201).json({
      success: true,
      data: emotion,
    });
  } catch (err) {
    next(err);
  }
};

export const fetchEmotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || (req.user as any)?.id;
    if (!userId) throw createHttpError(400, "userId required");
    if(userId !== (req.user as any)?.userId && userId !== (req.user as any)?.id && userId !== (req.user as any)?.sub){
      throw createHttpError(401, "User not found or authorized.");
    }
    const logs = await EmotionService.getEmotionLogs(userId);
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};
