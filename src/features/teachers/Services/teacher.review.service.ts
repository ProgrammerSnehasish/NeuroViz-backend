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
      include: {
        assignment: true,
        mindmap: { select: { title: true, structure: true } },
      },
    });

    if (!submission)
      throw createHttpError(404, "Submission not found.");
    if (submission.assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized: not your student's submission.");

    // ── Use AI summary as fallback feedback ──
    let finalFeedback = feedback;

    if (!finalFeedback) {

      // ── DOCUMENT type — no auto summary ──
      if (submission.contentType === "DOCUMENT") {
        finalFeedback = "Document submission reviewed manually.";
      } else {

        // ── Resolve evaluatable text ──
        let evaluatableText = "";

        switch (submission.contentType) {
          case "TEXT":
            evaluatableText = submission.textContent ?? "";
            break;

          case "MINDMAP":
            evaluatableText = submission.mindmap
              ? `Title: ${submission.mindmap.title}. Structure: ${JSON.stringify(submission.mindmap.structure)}`
              : "";
            break;

          case "MIXED":
            evaluatableText = [
              submission.textContent ?? "",
              submission.mindmap
                ? `Mindmap: ${submission.mindmap.title} — ${JSON.stringify(submission.mindmap.structure)}`
                : "",
            ].filter(Boolean).join("\n\n");
            break;
        }

        if (evaluatableText.trim()) {
          const summary = await NLPService.summarize(evaluatableText);
          finalFeedback = `AI Feedback: ${summary?.summary ?? "No summary generated."}`;
        } else {
          finalFeedback = "No content available for auto feedback.";
        }
      }
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: finalFeedback,
        status: "EVALUATED",
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        assignment: { select: { id: true, title: true } },
      },
    });

    await logActivity(
      teacherId,
      "REVIEW_SUBMISSION",
      `submissionId=${submissionId}, grade=${grade}, type=${submission.contentType}`
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
      include: {
        mindmap: { select: { title: true, structure: true } },
      },
    });

    if (!pendingSubmissions.length)
      throw createHttpError(404, "No pending submissions to review.");

    const results = await Promise.all(
      pendingSubmissions.map(async (sub) => {

        // ── Skip DOCUMENT type — can't auto-evaluate ──
        if (sub.contentType === "DOCUMENT") {
          return prisma.assignmentSubmission.update({
            where: { id: sub.id },
            data: {
              status: "PENDING_MANUAL_REVIEW",
              feedback: "Document submission requires manual review.",
            },
          });
        }

        // ── Resolve evaluatable text based on contentType ──
        let evaluatableText = "";

        switch (sub.contentType) {
          case "TEXT":
            evaluatableText = sub.textContent ?? "";
            break;

          case "MINDMAP":
            evaluatableText = sub.mindmap
              ? `Title: ${sub.mindmap.title}. Structure: ${JSON.stringify(sub.mindmap.structure)}`
              : "";
            break;

          case "MIXED":
            evaluatableText = [
              sub.textContent ?? "",
              sub.mindmap
                ? `Mindmap: ${sub.mindmap.title} — ${JSON.stringify(sub.mindmap.structure)}`
                : "",
            ].filter(Boolean).join("\n\n");
            break;
        }

        // ── Skip if nothing to evaluate ──
        if (!evaluatableText.trim()) {
          return prisma.assignmentSubmission.update({
            where: { id: sub.id },
            data: {
              status: "PENDING_MANUAL_REVIEW",
              feedback: "No evaluatable content found. Manual review required.",
            },
          });
        }

        // ── Run NLP ──
        const [sentiment, toxicity, summary] = await Promise.all([
          NLPService.sentiment(evaluatableText),
          NLPService.detectToxicity(evaluatableText),
          NLPService.summarize(evaluatableText),
        ]);

        let toxicityScore = toxicity?.score ?? 0;
        if (evaluatableText.length < 10) toxicityScore = 0;
        if (!/[a-zA-Z]/.test(evaluatableText)) toxicityScore = 0;
        if (toxicityScore > 0.95 && !/\s/.test(evaluatableText)) toxicityScore = 0;

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

        return prisma.assignmentSubmission.update({
          where: { id: sub.id },
          data: {
            grade: score,
            feedback,
            sentiment: sentiment?.label ?? undefined,
            sentimentScore: sentiment?.score ?? undefined,
            status: "EVALUATED",
          },
        });
      })
    );

    const evaluated = results.filter((r) => r.status === "EVALUATED").length;
    const pendingManualReview = results.filter((r) => r.status === "PENDING_MANUAL_REVIEW").length;

    await logActivity(
      teacherId,
      "BULK_REVIEW_SUBMISSIONS",
      `assignmentId=${assignmentId}, evaluated=${evaluated}, pendingManual=${pendingManualReview}`
    );

    return {
      message: `Bulk review completed.`,
      total: results.length,
      evaluated,
      pendingManualReview,
    };
  },

  // ─── REGENERATE AI SUMMARY ────────────────────────────────────────────────
  async regenerateSummary(teacherId: string, submissionId: string) {
    await this.validateTeacher(teacherId);

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
        mindmap: { select: { title: true, structure: true } },
      },
    });

    if (!submission)
      throw createHttpError(404, "Submission not found.");
    if (submission.assignment.teacherId !== teacherId)
      throw createHttpError(403, "Unauthorized access.");

    // ── DOCUMENT type can't be summarized ──
    if (submission.contentType === "DOCUMENT")
      throw createHttpError(400, "Document submissions cannot be auto-summarized.");

    // ── Resolve evaluatable text ──
    let evaluatableText = "";

    switch (submission.contentType) {
      case "TEXT":
        evaluatableText = submission.textContent ?? "";
        break;

      case "MINDMAP":
        evaluatableText = submission.mindmap
          ? `Title: ${submission.mindmap.title}. Structure: ${JSON.stringify(submission.mindmap.structure)}`
          : "";
        break;

      case "MIXED":
        evaluatableText = [
          submission.textContent ?? "",
          submission.mindmap
            ? `Mindmap: ${submission.mindmap.title} — ${JSON.stringify(submission.mindmap.structure)}`
            : "",
        ].filter(Boolean).join("\n\n");
        break;
    }

    if (!evaluatableText.trim())
      throw createHttpError(400, "No evaluatable content found to summarize.");

    const summary = await NLPService.summarize(evaluatableText);
    const feedback = `AI Summary: ${summary?.summary ?? "No summary available."}`;

    await logActivity(
      teacherId,
      "REGENERATE_SUBMISSION_SUMMARY",
      `submissionId=${submissionId}, type=${submission.contentType}`
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