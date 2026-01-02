import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { NLPService } from "../../nlp/nlp.service";
import { EvaluationMode, userRole } from "../../../config/core";
import e from "express";

async function logActivity(
  userId: string | null | undefined,
  action: string,
  details?: string
) {
  if (!userId) return; // do not log if no userId

  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (err) {
    console.error("⚠️ Failed to write activity log:", err);
  }
}

export const TeacherAssignmentService = {
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== userRole.Teacher)
    throw createHttpError(403, "Only teachers can manage assignments.");
    return user;
  },

  async createAssignment(
    teacherId: string,
    title: string,
    description?: string,
    options: { studentIds?: string[]; groupIds?: string[]; evaluationMode?: 'AUTO' | 'MANUAL' } = {}
  ) {
    await this.validateTeacher(teacherId);
    if ((!options?.studentIds || options.studentIds.length === 0) &&
      (!options?.groupIds || options.groupIds.length === 0)) {
      throw createHttpError(400, "You must assign to at least one student or group.");
    }
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        teacherId,
      },
    });

    // ✅ Assign to individual students (if provided)
    if (options?.studentIds?.length) {
      await prisma.assignmentStudent.createMany({
        data: options.studentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
        })),
      });
    }

    // ✅ Assign to groups (if provided)
    if (options?.groupIds?.length) {
      await prisma.assignmentGroup.createMany({
        data: options.groupIds.map((groupId) => ({
          assignmentId: assignment.id,
          groupId,
        })),
      });
    }

    await logActivity(
      teacherId,
      "CREATE_ASSIGNMENT",
      `assignmentId=${assignment.id}, title=${title}`
    );

    return {
      message: "Assignment created successfully.",
      assignment,
    };
  },

  /**
   * ✅ Get all assignments created by a teacher
   */
  async getAssignmentsByTeacher(teacherId: string) {
    await this.validateTeacher(teacherId);
    await logActivity(teacherId, "VIEW_ASSIGNMENTS", `teacherId=${teacherId}`);
    return await prisma.assignment.findMany({
      where: { teacherId },
      include: {
        assignedTo: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
        assignmentGroups: {
          include: { group: true },
        },
        submissions: true,
      },
    });
  },

  /**
   * ✅ View assignment details
   */
  async getAssignmentDetails(teacherId: string, assignmentId: string) {
    await this.validateTeacher(teacherId);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        assignedTo: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
        assignmentGroups: {
          include: { group: { include: { members: { include: { user: true } } } } },
        },
        submissions: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!assignment || assignment.teacherId !== teacherId)
      throw createHttpError(404, "Assignment not found or unauthorized.");

    await logActivity(
      teacherId,
      "VIEW_ASSIGNMENT_DETAILS",
      `assignmentId=${assignmentId}`
    );
    return assignment;
  },

  /**
   * ✅ Evaluate student submission using AI or manual
   */
  async evaluateAssignment(
    studentText: string,
    mode: EvaluationMode.Manual | EvaluationMode.Auto = EvaluationMode.Auto
  ) {
    if (mode === EvaluationMode.Manual) {
      return {
        score: null,
        sentiment: null,
        toxicity: null,
        summary: null,
        feedback: "Awaiting manual evaluation.",
      };
    }

    const [sentiment, toxicity, summary] = await Promise.all([
      NLPService.sentiment(studentText),
      NLPService.detectToxicity(studentText),
      NLPService.summarize(studentText),
    ]);

    // Fix toxicity false positives
    let toxicityScore = toxicity?.score ?? 0;
    if (studentText.length < 10) toxicityScore = 0;
    if (!/[a-zA-Z]/.test(studentText)) toxicityScore = 0;
    if (toxicityScore > 0.95 && !/\s/.test(studentText)) toxicityScore = 0;

    let score = 70;
    if (sentiment?.label?.includes("POSITIVE")) score += 10;
    if (sentiment?.label?.includes("NEGATIVE")) score -= 10;
    if (toxicityScore > 0.5) score -= 20;

    const feedback = `
${summary?.summary ?? "No summary available."}
Tone: ${sentiment?.label}
Toxicity: ${(toxicityScore * 100).toFixed(2)}%
Final AI Grade: ${score}/100.
`;

    await logActivity(
      null,
      "EVALUATE_ASSIGNMENT_AUTO",
      `score=${score}, sentiment=${sentiment?.label}, toxicity=${toxicityScore.toFixed(2)}`
    );

    return {
      score,
      sentiment,
      toxicity: { ...toxicity, score: toxicityScore },
      summary,
      feedback,
    };
  },

  /**
   * ✅ Evaluate and store submission result
   */
  async evaluateSubmission(
    teacherId: string,
    submissionId: string,
    mode: EvaluationMode.Manual | EvaluationMode.Auto = EvaluationMode.Auto,
    manual: { grade?: number; feedback?: string } = {}
  ) {
    await this.validateTeacher(teacherId);

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });

    if (!submission || submission.assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized to evaluate this submission.");

    let result;

    // MANUAL MODE
    if (mode === EvaluationMode.Manual) {
      if (manual.grade === undefined || !manual.feedback)
        throw createHttpError(400, "Manual evaluation requires grade and feedback.");

      result = {
        score: manual.grade,
        sentiment: null,
        toxicity: null,
        summary: null,
        feedback: manual.feedback,
      };
    } else {
      // AUTO MODE
      result = await this.evaluateAssignment(submission.content, EvaluationMode.Auto);
    }

    await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: result.score ?? undefined,
        feedback: result.feedback,
        sentiment: result.sentiment?.label ?? undefined,
        sentimentScore: result.sentiment?.score ?? undefined,
      },
    });

    await logActivity(
      teacherId,
      "EVALUATE_SUBMISSION",
      `submissionId=${submissionId}, mode=${mode}, score=${result.score}`
    );

    return { message: "Evaluation completed.", result };
  },

  /**
   * ✅ Get submissions for a student (under this teacher)
   */
  async getSubmissionsForStudent(teacherId: string, studentId: string) {
    await this.validateTeacher(teacherId);

    const student = await prisma.user.findFirst({
      where: { id: studentId, createdBy: teacherId, role: userRole.Student },
    });
    if (!student) throw createHttpError(403, "Student not found under your class.");
    await logActivity(
      teacherId,
      "VIEW_STUDENT_SUBMISSIONS",
      `studentId=${studentId}`
    );
    return prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: { assignment: true },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * ✅ Delete assignment
   */
  async deleteAssignment(teacherId: string, assignmentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, teacherId: true },
    });

    if (!assignment) throw createHttpError(404, "Assignment not found.");
    if (assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized to delete this assignment.");

    await prisma.assignmentStudent.deleteMany({ where: { assignmentId } });
    await prisma.assignmentSubmission.deleteMany({ where: { assignmentId } });
    await prisma.assignmentGroup.deleteMany({ where: { assignmentId } });

    const deleted = await prisma.assignment.delete({
      where: { id: assignmentId },
      select: { id: true, title: true, createdAt: true },
    });
    await logActivity(
      teacherId,
      "DELETE_ASSIGNMENT",
      `assignmentId=${assignmentId}`
    );
    return {
      message: "Assignment deleted successfully.",
      assignment: deleted,
    };
  },

  /**
 * ✅ Update an assignment (title, description, student/group assignment, etc.)
 */
  async updateAssignment(
    teacherId: string,
    assignmentId: string,
    updateData: {
      title?: string;
      description?: string;
      studentIds?: string[];
      groupIds?: string[];
      evaluationMode?: EvaluationMode.Auto | EvaluationMode.Manual;
    }
  ) {
    await this.validateTeacher(teacherId);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        assignmentGroups: true,
        assignedTo: true,
      },
    });

    if (!assignment || assignment.teacherId !== teacherId)
      throw createHttpError(404, "Assignment not found or unauthorized.");

    // ✅ Update core fields
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: updateData.title ?? assignment.title,
        description: updateData.description ?? assignment.description,
      },
    });

    // ✅ Handle student assignments update (if provided)
    if (updateData.studentIds) {
      // Remove existing student links
      await prisma.assignmentStudent.deleteMany({
        where: { assignmentId },
      });
      // Add new ones
      if (updateData.studentIds.length > 0) {
        await prisma.assignmentStudent.createMany({
          data: updateData.studentIds.map((studentId) => ({
            assignmentId,
            studentId,
          })),
        });
      }
    }

    // ✅ Handle group assignments update (if provided)
    if (updateData.groupIds) {
      // Remove existing group links
      await prisma.assignmentGroup.deleteMany({
        where: { assignmentId },
      });
      // Add new ones
      if (updateData.groupIds.length > 0) {
        await prisma.assignmentGroup.createMany({
          data: updateData.groupIds.map((groupId) => ({
            assignmentId,
            groupId,
          })),
        });
      }
    }
    await logActivity(
      teacherId,
      "UPDATE_ASSIGNMENT",
      `assignmentId=${assignmentId}`
    );
    return {
      message: "Assignment updated successfully.",
      assignment: updatedAssignment,
    };
  },

};
