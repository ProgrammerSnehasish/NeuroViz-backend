import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { runAdaptationForUser } from "./adapt.service";

export const triggerAdaptation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId =
      req.params.userId ||
      (req.user as any)?.id ||
      (req.user as any)?.userId ||
      (req.user as any)?.sub;

    if (!userId) throw createHttpError(400, "User ID required");

    const requesterId =
      (req.user as any)?.id ||
      (req.user as any)?.userId ||
      (req.user as any)?.sub;

    if (userId !== requesterId) {
      throw createHttpError(401, "Not authorized to trigger adaptation for this user.");
    }

    const result = await runAdaptationForUser(userId);

    res.status(200).json({
      success: true,
      message: result.applied
        ? "Adaptation applied successfully."
        : "No adaptation changes needed.",
      changes: result.changes,
      reason: result.reason,
    });
  } catch (err) {
    next(err);
  }
};
