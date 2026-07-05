import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { userRole } from "../config/core";
import { resolveUserFromToken } from "../utils/resolveUserFromToken";
import prisma from "../config/database";

export const enforceVerifiedTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ── Step 1: Resolve token and check role ──
    const found = await resolveUserFromToken(req);

    if (found.role !== userRole.Teacher)
      throw createHttpError(403, "Teacher access only.");

    // ── Step 2: Check account is active ──
    if (!found.isActive)
      throw createHttpError(403, "Your account has been deactivated. Please contact support.");

    // ── Step 3: Check profile exists and is verified ──
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: found.id },
    });

    if (!profile)
      throw createHttpError(403, "Please complete your teacher profile before proceeding.");

    if (!profile.isVerified)
      throw createHttpError(403, "Your profile is not verified yet. Please submit for admin review.");

    // ── Step 4: Set locals ──
    res.locals.teacherId = found.id;
    res.locals.userId    = found.id;

    next();
  } catch (err) {
    next(err);
  }
};