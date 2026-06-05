import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { userRole } from "../config/core";
import { resolveUserFromToken } from "../utils/resolveUserFromToken";

export const enforceTeacherOrStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const found = await resolveUserFromToken(req);

    if (found.role !== userRole.Teacher && found.role !== userRole.Student) {
      throw createHttpError(403, "Teacher or Student access only.");
    }

    res.locals.userId = found.id;       // ✅ use res.locals instead of req.body
    res.locals.userRole = found.role;

    next();
  } catch (err) {
    next(err);
  }
};