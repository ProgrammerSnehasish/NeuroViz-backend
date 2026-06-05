import { NextFunction, Request, Response } from "express";
import prisma from "../config/database";
import createHttpError from "http-errors";
import { userRole } from "../config/core";
import { resolveUserFromToken } from "../utils/resolveUserFromToken";

export const enforceTeacherStudentRelation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const found = await resolveUserFromToken(req);

    if (found.role !== userRole.Teacher) {
      throw createHttpError(403, "Access restricted to teachers only");
    }

    const teacherId = found.id;

    // Resolve studentId: params → res.locals (set by enforceStudent) → body
    const studentId =
      req.params.userId     ||
      req.params.studentId  ||
      res.locals.studentId  ||   // ✅ read from res.locals
      req.body?.studentId;       // ✅ safe optional chaining for non-GET routes

    if (!studentId) {
      throw createHttpError(400, "Missing student ID");
    }

    if (studentId === teacherId) {
      throw createHttpError(400, "Teacher and student cannot be the same user");
    }

    const relation = await prisma.teacherStudent.findFirst({
      where: { teacherId, studentId },
    });
    if (relation) return next();

    const inGroup = await prisma.groupMember.findFirst({
      where: { userId: studentId, group: { teacherId } },
    });
    if (inGroup) return next();

    const assignmentRel = await prisma.assignmentSubmission.findFirst({
      where: { studentId, assignment: { teacherId } },
    });
    if (assignmentRel) return next();

    throw createHttpError(403, "Illegal access: Student does not belong to this teacher");

  } catch (err) {
    next(err);
  }
};