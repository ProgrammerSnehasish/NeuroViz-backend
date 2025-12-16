import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import * as CognitiveService from "./cognitiveProfile.service";
import prisma from "../../config/database";

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || (req.user as any)?.id;

    if (!userId) {
      throw createHttpError(401, "Unauthorized");
    }

    const profile = await CognitiveService.getCognitiveProfile(userId);
    if (!profile) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: "COGNITIVE_PROFILE_NOT_FOUND",
          details: `Cognitive profile not found for user ${userId}.`,
        },
      })
      throw createHttpError(404, "Profile not found");
    } 

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};
