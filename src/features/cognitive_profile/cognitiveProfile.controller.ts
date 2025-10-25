import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import * as CognitiveService from "./cognitiveProfile.service";

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const { attentionScore, focusDuration, interactions } = req.body;

    const profile = await CognitiveService.upsertCognitiveProfile(userId, {
      attentionScore,
      focusDuration,
      interactions,
    });

    res.status(200).json({
      success: true,
      message: "Cognitive profile updated successfully",
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || (req.user as any)?.id;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const profile = await CognitiveService.getCognitiveProfile(userId);
    if (!profile) throw createHttpError(404, "Profile not found");

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};
