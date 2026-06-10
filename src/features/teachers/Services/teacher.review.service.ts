import prisma from "../../../config/database";
import createHttpError from "http-errors";
import { NLPService } from "../../nlp/nlp.service";
import { userRole } from "../../../config/core";

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

export const TeacherReviewService = {
  // ─── Validate teacher ─────────────────────────────────────────────────────
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== userRole.Teacher)
      throw createHttpError(403, "Only teachers can review submissions.");
    return user;
  },

  // ─── GET ALL SUBMISSIONS FOR TEACHER ─────────────────────────────────────
  /**
   * Returns all submissions across all of a teacher's assignments,
   * enriched with per-submission graded/pending status.
   * Used for the "Pending Grading" view on Assignment Management page.
   */
  async getSubmissionsForTeacher(teacherId: string) {
    await this.validateTeacher(teacherId);

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignment: { teacherId } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignment: { select: { id: true, title: true, dueDate: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    await logActivity(teacherId, "VIEW_SUBMISSIONS", `teacherId=${teacherId}`);
    return submissions;
  },

  // ─── GET PENDING SUBMISSIONS ──────────────────────────────────────────────
  /**
   * Returns only submissions that have been submitted but not yet graded.
   * Used for the "Pending Grading" badge count on the dashboard.
   */
  async getPendingSubmissions(teacherId: string) {
    await this.validateTeacher(teacherId);

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignment: { teacherId },
        status: "SUBMITTED",
        grade: null,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        assignment: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    await logActivity(
      teacherId,
      "VIEW_PENDING_SUBMISSIONS",
      `count=${submissions.length}`
    );
    return { pendingCount: submissions.length, submissions };
  },

  // ─── REVIEW SUBMISSION (manual + AI-assisted) ─────────────────────────────
  /**
   * Grade a submission manually, optionally using AI to generate
   * a feedback summary if no manual feedback is provided.
   */
  async reviewSubmission(
    teacherId: string,
    submissionId: string,
    grade: number,
    feedback?: string
  ) {
    await this.validateTeacher(teacherId);

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });

    if (!submission) throw createHttpError(404, "Submission not found.");
    if (submission.assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized: not your student's submission.");

    // Use AI summary as fallback feedback
    let finalFeedback = feedback;
    if (!finalFeedback) {
      const summary = await NLPService.summarize(submission.content);
      finalFeedback = `AI Feedback: ${summary?.summary ?? "No summary generated."}`;
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: finalFeedback,
        status: "REVIEWED",
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        assignment: { select: { id: true, title: true } },
      },
    });

    await logActivity(
      teacherId,
      "REVIEW_SUBMISSION",
      `submissionId=${submissionId}, grade=${grade}`
    );
    return { message: "Submission reviewed successfully.", data: updated };
  },

  // ─── BULK REVIEW ──────────────────────────────────────────────────────────
  /**
   * Review multiple submissions at once (AI auto-grade all pending).
   * Useful for batch grading from the Assignment Management page.
   */
  async bulkReviewSubmissions(
    teacherId: string,
    assignmentId: string
  ) {
    await this.validateTeacher(teacherId);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized to review this assignment.");

    const pendingSubmissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId, status: "SUBMITTED", grade: null },
    });

    if (!pendingSubmissions.length)
      throw createHttpError(404, "No pending submissions to review.");

    const results = await Promise.all(
      pendingSubmissions.map(async (sub) => {
        const [sentiment, toxicity, summary] = await Promise.all([
          NLPService.sentiment(sub.content),
          NLPService.detectToxicity(sub.content),
          NLPService.summarize(sub.content),
        ]);

        let score = 70;
        if (sentiment?.label?.includes("POSITIVE")) score += 10;
        if (sentiment?.label?.includes("NEGATIVE")) score -= 10;
        if ((toxicity?.score ?? 0) > 0.5) score -= 20;

        const feedback = `AI Grade: ${score}/100. ${summary?.summary ?? ""}`.trim();

        return prisma.assignmentSubmission.update({
          where: { id: sub.id },
          data: {
            grade: score,
            feedback,
            sentiment: sentiment?.label ?? undefined,
            sentimentScore: sentiment?.score ?? undefined,
            status: "REVIEWED",
          },
        });
      })
    );

    await logActivity(
      teacherId,
      "BULK_REVIEW_SUBMISSIONS",
      `assignmentId=${assignmentId}, count=${results.length}`
    );
    return {
      message: `${results.length} submission(s) reviewed successfully.`,
      reviewed: results.length,
    };
  },

  // ─── REGENERATE AI SUMMARY ────────────────────────────────────────────────
  async regenerateSummary(teacherId: string, submissionId: string) {
    await this.validateTeacher(teacherId);

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });

    if (!submission) throw createHttpError(404, "Submission not found.");
    if (submission.assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized access.");

    const summary = await NLPService.summarize(submission.content);
    const feedback = `AI Summary: ${summary?.summary ?? "No summary available."}`;

    await logActivity(
      teacherId,
      "REGENERATE_SUBMISSION_SUMMARY",
      `submissionId=${submissionId}`
    );
    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { feedback },
    });
  },

  // ─── GET SINGLE SUBMISSION ────────────────────────────────────────────────
  async getSubmissionById(teacherId: string, submissionId: string) {
    await this.validateTeacher(teacherId);

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignment: { select: { id: true, title: true, description: true, teacherId: true } },
      },
    });

    if (!submission) throw createHttpError(404, "Submission not found.");
    if (submission.assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized to view this submission.");

    await logActivity(
      teacherId,
      "VIEW_SUBMISSION_DETAIL",
      `submissionId=${submissionId}`
    );
    return submission;
  },
};