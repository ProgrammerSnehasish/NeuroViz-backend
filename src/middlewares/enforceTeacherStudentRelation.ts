import { Request, Response, NextFunction } from "express";
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

    if (found.role !== userRole.Teacher)
      throw createHttpError(403, "Access restricted to teachers only.");

    if (!found.isActive)
      throw createHttpError(403, "Your account has been deactivated. Please contact support.");

    const teacherId = found.id;

    const studentId =
      req.params.userId    ||
      req.params.studentId ||
      res.locals.studentId ||
      req.body?.studentId;

    if (!studentId)
      throw createHttpError(400, "Missing student ID.");

    if (studentId === teacherId)
      throw createHttpError(400, "Teacher and student cannot be the same user.");

    // ── Check student is also active ──
    const student = await prisma.user.findUnique({
      where:  { id: studentId },
      select: { isActive: true },
    });

    if (!student)
      throw createHttpError(404, "Student not found.");

    if (!student.isActive)
      throw createHttpError(403, "This student's account has been deactivated.");

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

    throw createHttpError(403, "Illegal access: Student does not belong to this teacher.");

  } catch (err) {
    next(err);
  }
};