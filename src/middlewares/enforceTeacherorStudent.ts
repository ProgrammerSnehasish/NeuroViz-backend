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

    if (found.role !== userRole.Teacher && found.role !== userRole.Student)
      throw createHttpError(403, "Teacher or Student access only.");

    if (!found.isActive)
      throw createHttpError(403, "Your account has been deactivated. Please contact support.");

    res.locals.userId    = found.id;
    res.locals.userRole  = found.role;

    // ── Set role-specific locals ──
    if (found.role === userRole.Teacher) res.locals.teacherId = found.id;
    if (found.role === userRole.Student) res.locals.studentId = found.id;

    next();
  } catch (err) {
    next(err);
  }
};