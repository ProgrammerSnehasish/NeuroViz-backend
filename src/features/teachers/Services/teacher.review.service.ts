import prisma from "../../../config/database";
import createHttpError from "http-errors";
import axios from "axios";
import { NLP } from "../../../utils/env";
import { userRole } from "../../../config/core";

/**
 * 🧠 Summarize text using Hugging Face API (facebook/bart-large-cnn)
 */
async function summarizeText(text: string): Promise<string> {
  if (!NLP.hfKey) return "No summary generated (missing NLP key).";

  try {
    const { data } = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      { inputs: text },
      { headers: { Authorization: `Bearer ${NLP.hfKey}` }, timeout: 80000 }
    );

    return data?.[0]?.summary_text ?? "No summary generated.";
  } catch (err: any) {
    console.error("Summary generation failed:", err.message);
    return "No summary available due to API error.";
  }
}

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

export const TeacherReviewService = {
  /**
   * ✅ Validate if the user is a TEACHER
   */
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== userRole.Teacher) {
    throw createHttpError(403, "Only teachers can review assignments.");
  }
    return user;
},

  /**
   * 🧾 Review a student submission (manual or AI-assisted)
   * - Validates teacher
   * - Summarizes student’s content via HuggingFace
   * - Updates feedback + grade
   */
  async reviewSubmission(
    userId: string,
    submissionId: string,
    grade: number,
    feedback?: string
  ) {
    await this.validateTeacher(userId);

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });

    if (!submission) throw createHttpError(404, "Submission not found.");
    if (submission.assignment.teacherId !== userId)
      throw createHttpError(403, "Unauthorized: not your student’s submission.");

    const aiSummary = await summarizeText(submission.content);

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: feedback ?? `AI Feedback: ${aiSummary}`,
        status: "REVIEWED",
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        assignment: { select: { title: true } },
      },
    });
    await logActivity(
      userId,
      "REVIEW_SUBMISSION",
      `submissionId=${submissionId}, grade=${grade}`
    );
    return {
      message: "Submission reviewed successfully.",
      data: updated,
    };
  },

    /**
     * 🧮 Get all submissions under a teacher’s assignments
     */
    async getSubmissionsForTeacher(userId: string) {
  await this.validateTeacher(userId);
  await logActivity(userId, "VIEW_SUBMISSIONS", `teacherId=${userId}`);
  return prisma.assignmentSubmission.findMany({
    where: { assignment: { teacherId: userId } },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      assignment: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
},

  /**
   * 🧩 (Optional) Re-summarize an existing submission feedback
   * Useful if you want to trigger re-analysis later
   */
  async regenerateSummary(userId: string, submissionId: string) {
  await this.validateTeacher(userId);

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });

  if (!submission) throw createHttpError(404, "Submission not found.");
  if (submission.assignment.teacherId !== userId)
    throw createHttpError(403, "Unauthorized access.");

  const summary = await summarizeText(submission.content);
  await logActivity(
    userId,
    "REGENERATE_SUBMISSION_SUMMARY",
    `submissionId=${submissionId}`
  );
  return prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: { feedback: `AI Summary: ${summary}` },
  });
},
};
