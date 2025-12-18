import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import prisma from "../config/database";

export const enforceTeacherOrStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;

    if (!user) {
      throw createHttpError(401, "Unauthorized - Token missing");
    }

    const tokenUserId = user.userId || user.id || user.sub;

    const found = await prisma.user.findUnique({
      where: { id: tokenUserId },
      select: { id: true, role: true },
    });

    if (!found) {
      throw createHttpError(401, "Invalid token user");
    }

    if (found.role !== "TEACHER" && found.role !== "STUDENT") {
      throw createHttpError(403, "Teacher or Student access only.");
    }

    // Attach useful data for downstream controllers
    req.body.userId = found.id;
    req.body.userRole = found.role;

    next();
  } catch (err) {
    next(err);
  }
};
