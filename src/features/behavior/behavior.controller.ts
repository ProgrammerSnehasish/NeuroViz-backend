//TODO: To be implemented at frontend side.
import { Request, Response, NextFunction } from "express";
import { recordBehavior } from "./behavior.service";
import createHttpError from "http-errors";
import { BehaviorType } from "@prisma/client";

export const trackBehavior = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId =
      (req.user as any)?.id ||
      (req.user as any)?.userId ||
      (req.user as any)?.sub;

    if (!userId) {
      throw createHttpError(401, "Unauthorized");
    }

    const { type } = req.body;

    if(!Object.values(BehaviorType).includes(type)) {
      throw createHttpError(400, "Invalid behavior type");
    }
    
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata) ? req.body.metadata : undefined;
    
    const metadataSize = JSON.stringify(metadata || {}).length;
    if (metadataSize > 5_000) {
      throw createHttpError(413, "Behavior metadata too large");
    }

    await recordBehavior(userId, type, metadata);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};
