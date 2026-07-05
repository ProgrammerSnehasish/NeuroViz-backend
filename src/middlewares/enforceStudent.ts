import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { userRole } from "../config/core";
import { resolveUserFromToken } from "../utils/resolveUserFromToken";

export const enforceStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const found = await resolveUserFromToken(req);

    if (found.role !== userRole.Student)
      throw createHttpError(403, "Student access only.");

    if (!found.isActive)
      throw createHttpError(403, "Your account has been deactivated. Please contact support.");

    res.locals.studentId = found.id;
    res.locals.userId    = found.id;

    next();
  } catch (err) {
    next(err);
  }
};