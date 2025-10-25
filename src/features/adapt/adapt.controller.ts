import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { runAdaptationForUser } from "./adapt.service";

export const triggerAdaptation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || (req.user as any)?.id;
    if (!userId) throw createHttpError(400, "userId required");

    const result = await runAdaptationForUser(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
