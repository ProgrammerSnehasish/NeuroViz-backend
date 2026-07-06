import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { NLPService } from "../../nlp/nlp.service";
import { EvaluationMode, userRole } from "../../../config/core";

async function logActivity(
  userId: string | null | undefined,
  action: string,
  details?: string
) {
  if (!userId) return;
  try {
    await prisma.activityLog.create({ data: { userId, action, details } });
  } catch (err) {
    console.error("⚠️ Failed to write activity log:", err);
  }
}

export const TeacherAssignmentService = {
  // ─── Validate teacher ─────────────────────────────────────────────────────
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== userRole.Teacher)
      throw createHttpError(403, "Only teachers can manage assignments.");
    return user;
  },

  // ─── ASSIGNMENT MANAGEMENT PAGE ───────────────────────────────────────────
  /**
   * Returns the 4 KPI cards + enriched assignment list for the
   * Assignment Management page:
   *   totalAssignments, active, pendingGrading, avgCompletion (%)
   *   assignments[]: each row includes submissions, graded, pending counts
   */
  async getAssignmentManagementOverview(teacherId: string) {
    await this.validateTeacher(teacherId);

    const assignments = await prisma.assignment.findMany({
      where: { teacherId },
      include: {
        assignedTo: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        assignmentGroups: {
          include: {
            group: {
              include: { _count: { select: { members: true } } }
            }
          },
        },
        submissions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Enrich each assignment with derived counts
    const now = new Date();
    const enriched = assignments.map((a) => {
      const totalSubmissions = a.submissions.length;
      const graded = a.submissions.filter(
        (s) => s.grade !== null && s.grade !== undefined
      ).length;
      const pending = a.submissions.filter(
        (s) => s.status === "SUBMITTED" && (s.grade === null || s.grade === undefined)
      ).length;

      // Total assignees = individual students + all members of assigned groups
      const individualCount = a.assignedTo.length;
      const groupMemberCount = a.assignmentGroups.reduce(
        (acc, ag) => acc + (ag.group?._count?.members ?? 0),
        0
      );
      const totalAssignees = individualCount + groupMemberCount || 1;

      const completionPct = Math.round((totalSubmissions / totalAssignees) * 100);

      const isActive = a.dueDate ? new Date(a.dueDate) >= now : true;

      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        status: isActive ? "Active" : "Closed",
        totalSubmissions,
        graded,
        pending,
        completionPct,
        assignedStudents: a.assignedTo.map((as) => as.student),
        assignedGroups: a.assignmentGroups.map((ag) => ag.group),
      };
    });

    // KPI counts
    const activeCount = enriched.filter((a) => a.status === "Active").length;
    const pendingGradingTotal = enriched.reduce((acc, a) => acc + a.pending, 0);
    const avgCompletion =
      enriched.length > 0
        ? Math.round(
          enriched.reduce((acc, a) => acc + a.completionPct, 0) / enriched.length
        )
        : 0;

    await logActivity(teacherId, "VIEW_ASSIGNMENT_MANAGEMENT_OVERVIEW", `assignments=${assignments.length}`);

    return {
      totalAssignments: assignments.length,
      active: activeCount,
      pendingGrading: pendingGradingTotal,
      avgCompletion, // e.g. 78 → "78%"
      assignments: enriched,
    };
  },

  // ─── CREATE ASSIGNMENT ────────────────────────────────────────────────────
  async createAssignment(
    teacherId: string,
    title: string,
    description?: string,
    options: {
      studentIds?: string[];
      groupIds?: string[];
      evaluationMode?: "AUTO" | "MANUAL";
      dueDate?: Date;
    } = {}
  ) {
    await this.validateTeacher(teacherId);

    if (
      (!options?.studentIds || options.studentIds.length === 0) &&
      (!options?.groupIds || options.groupIds.length === 0)
    ) {
      throw createHttpError(400, "You must assign to at least one student or group.");
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        teacherId,
        dueDate: options.dueDate,
      },
    });

    if (options?.studentIds?.length) {
      await prisma.assignmentStudent.createMany({
        data: options.studentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
        })),
      });
    }

    if (options?.groupIds?.length) {
      await prisma.assignmentGroup.createMany({
        data: options.groupIds.map((groupId) => ({
          assignmentId: assignment.id,
          groupId,
        })),
      });
    }

    await logActivity(teacherId, "CREATE_ASSIGNMENT", `assignmentId=${assignment.id}, title=${title}`);
    return { message: "Assignment created successfully.", assignment };
  },

  // ─── GET ALL ASSIGNMENTS (plain list) ────────────────────────────────────
  async getAssignmentsByTeacher(teacherId: string) {
    await this.validateTeacher(teacherId);
    await logActivity(teacherId, "VIEW_ASSIGNMENTS", `teacherId=${teacherId}`);
    return prisma.assignment.findMany({
      where: { teacherId },
      include: {
        assignedTo: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
        assignmentGroups: { include: { group: true } },
        submissions: true,
      },
    });
  },

  // ─── GET ASSIGNMENT DETAILS ───────────────────────────────────────────────
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

    await logActivity(teacherId, "VIEW_ASSIGNMENT_DETAILS", `assignmentId=${assignmentId}`);
    return assignment;
  },

  // ─── EVALUATE (AI helper) ─────────────────────────────────────────────────
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
  `.trim();

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

  // ─── EVALUATE & STORE SUBMISSION ──────────────────────────────────────────
  async evaluateSubmission(
    teacherId: string,
    submissionId: string,
    evaluationMode: EvaluationMode.Manual | EvaluationMode.Auto = EvaluationMode.Auto,
    manual: { grade?: number; feedback?: string } = {}
  ) {
    await this.validateTeacher(teacherId);

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
        mindmap: { select: { id: true, title: true, structure: true } },
      },
    });

    if (!submission || submission.assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized to evaluate this submission.");

    if (submission.status === "EVALUATED")
      throw createHttpError(400, "This submission has already been evaluated.");

    let result;

    if (evaluationMode === EvaluationMode.Manual) {
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
      // ── Resolve evaluatable content based on contentType ──
      switch (submission.contentType) {
        case "TEXT":
          if (!submission.textContent)
            throw createHttpError(400, "No text content found for auto evaluation.");

          result = await this.evaluateAssignment(
            submission.textContent,
            EvaluationMode.Auto
          );
          break;

        case "MINDMAP":
          if (!submission.mindmap)
            throw createHttpError(400, "No mindmap found for auto evaluation.");

          // ── Serialize mindmap structure as text for NLP evaluation ──
          const mindmapText = `Title: ${submission.mindmap.title}. Structure: ${JSON.stringify(submission.mindmap.structure)}`;

          result = await this.evaluateAssignment(
            mindmapText,
            EvaluationMode.Auto
          );
          break;

        case "DOCUMENT":
          // ── Documents can't be auto-evaluated — force manual ──
          throw createHttpError(400, "Document submissions cannot be auto-evaluated. Please use manual evaluation.");

        case "MIXED":
          // ── Use textContent for NLP, note mindmap presence ──
          const mixedText = [
            submission.textContent ?? "",
            submission.mindmap
              ? `Mindmap: ${submission.mindmap.title} — ${JSON.stringify(submission.mindmap.structure)}`
              : "",
          ].filter(Boolean).join("\n\n");

          if (!mixedText.trim())
            throw createHttpError(400, "No evaluatable content found in mixed submission.");

          result = await this.evaluateAssignment(
            mixedText,
            EvaluationMode.Auto
          );
          break;

        default:
          throw createHttpError(400, "Unknown submission content type.");
      }
    }

    // ── Update submission ──
    await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: result.score ?? undefined,
        feedback: result.feedback ?? undefined,
        sentiment: result.sentiment?.label ?? undefined,
        sentimentScore: result.sentiment?.score ?? undefined,
        status: "EVALUATED",
      },
    });

    await logActivity(
      teacherId,
      "EVALUATE_SUBMISSION",
      `submissionId=${submissionId}, mode=${evaluationMode}, type=${submission.contentType}, score=${result.score}`
    );

    return { message: "Evaluation completed.", result };
  },

  // ─── SUBMISSIONS FOR A STUDENT ────────────────────────────────────────────
  async getSubmissionsForStudent(teacherId: string, studentId: string) {
    await this.validateTeacher(teacherId);

    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: userRole.Student,
        OR: [
          { createdBy: teacherId },
          { studentTeachers: { some: { teacherId } } },
        ],
      },
    });
    if (!student)
      throw createHttpError(403, "Student not found under your class.");

    await logActivity(teacherId, "VIEW_STUDENT_SUBMISSIONS", `studentId=${studentId}`);
    return prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: { assignment: true },
      orderBy: { createdAt: "desc" },
    });
  },

  // ─── DELETE ASSIGNMENT ────────────────────────────────────────────────────
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

    await logActivity(teacherId, "DELETE_ASSIGNMENT", `assignmentId=${assignmentId}`);
    return { message: "Assignment deleted successfully.", assignment: deleted };
  },

  // ─── UPDATE ASSIGNMENT ────────────────────────────────────────────────────
  async updateAssignment(
    teacherId: string,
    assignmentId: string,
    updateData: {
      title?: string;
      description?: string;
      dueDate?: Date;
      studentIds?: string[];
      groupIds?: string[];
      evaluationMode?: EvaluationMode;
    }
  ) {
    await this.validateTeacher(teacherId);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { assignmentGroups: true, assignedTo: true },
    });

    if (!assignment || assignment.teacherId !== teacherId)
      throw createHttpError(404, "Assignment not found or unauthorized.");

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: updateData.title ?? assignment.title,
        description: updateData.description ?? assignment.description,
        dueDate: updateData.dueDate ?? assignment.dueDate,
        evaluationMode: updateData.evaluationMode ?? assignment.evaluationMode,
      },
    });

    if (updateData.studentIds) {
      await prisma.assignmentStudent.deleteMany({ where: { assignmentId } });
      if (updateData.studentIds.length > 0) {
        await prisma.assignmentStudent.createMany({
          data: updateData.studentIds.map((studentId) => ({ assignmentId, studentId })),
        });
      }
    }

    if (updateData.groupIds) {
      await prisma.assignmentGroup.deleteMany({ where: { assignmentId } });
      if (updateData.groupIds.length > 0) {
        await prisma.assignmentGroup.createMany({
          data: updateData.groupIds.map((groupId) => ({ assignmentId, groupId })),
        });
      }
    }

    await logActivity(teacherId, "UPDATE_ASSIGNMENT", `assignmentId=${assignmentId}`);
    return { message: "Assignment updated successfully.", assignment: updatedAssignment };
  },
};