import { NextFunction, Request, Response } from "express";
import prisma from "../config/database";
import createHttpError from "http-errors";

export const enforceTeacherStudentRelation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user?.userId;
    const studentId = req.params.userId || req.body.studentId;

    if (!teacherId || !studentId) {
      throw createHttpError(400, "Missing teacher or student ID");
    }

    // Check teacher-student mapping
    const relation = await prisma.teacherStudent.findFirst({
      where: { teacherId, studentId },
    });

    if (relation) return next();

    // Check shared group membership
    const inGroup = await prisma.groupMember.findFirst({
      where: {
        userId: studentId,
        group: {
          teacherId,
        },
      },
    });

    if (inGroup) return next();

    // (optional) Check if student submitted assignment owned by teacher
    const assignmentRel = await prisma.assignmentSubmission.findFirst({
      where: {
        studentId,
        assignment: { teacherId }
      }
    });

    if (assignmentRel) return next();

    // If all checks fail → Unauthorized
    throw createHttpError(403, "Illegal access: Student does not belong to this teacher");

  } catch (err) {
    next(err);
  }
};

// TODO: To be added in future to teacher Routers.