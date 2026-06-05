import { NextFunction, Request, Response } from "express";
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

    if (found.role !== userRole.Student) {
      throw createHttpError(403, "Student access only.");
    }

    res.locals.studentId = found.id;    // ✅ use res.locals
    res.locals.userId = found.id;

    next();
  } catch (err) {
    next(err);
  }
};