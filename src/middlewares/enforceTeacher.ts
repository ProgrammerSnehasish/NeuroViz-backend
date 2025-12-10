import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import prisma from "../config/database";

export const enforceTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;

    if (!user) throw createHttpError(401, "Unauthorized - Token missing");

    const tokenUserId = user.userId || user.id || user.sub;

    const found = await prisma.user.findUnique({
      where: { id: tokenUserId },
      select: { id: true, role: true },
    });

    if (!found) {
      throw createHttpError(401, "Invalid token user");
    }

    if (found.role !== "TEACHER") {
      throw createHttpError(403, "Teacher access only.");
    }

    req.body.teacherId = found.id;
    req.params.teacherId = found.id;

    next();
  } catch (err) {
    next(err);
  }
};
