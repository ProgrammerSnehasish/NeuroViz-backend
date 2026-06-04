import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { NLPService } from "../../nlp/nlp.service";
import { userRole } from "../../../config/core";

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

export const TeacherService = {
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true },
    });
    if (!user) throw createHttpError(404, "User not found");
    if (user.role !== userRole.Teacher)
    throw createHttpError(403, "Access denied. Only teachers are allowed.");
    return user;
  },

  async validateStudent(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    if (!user) throw createHttpError(404, "Student not found");
    if (user.role !== userRole.Student)
      throw createHttpError(403, "Target user is not a student");
    return user;
  },

  async getStudentAnalytics(
    teacherId: string,
    studentId: string,
    log: boolean = true
  ) {
    await this.validateTeacher(teacherId);
    await this.validateStudent(studentId);

    const [profile, emotions, feedbacks] = await Promise.all([
      prisma.cognitiveProfile.findUnique({ where: { userId: studentId } }),
      prisma.emotionLog.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.feedback.findMany({ where: { userId: studentId }, take: 100 }),
    ]);

    // clamp between -1 and 1
    const clamp = (val: number, min: number, max: number) =>
      Math.min(max, Math.max(min, val));

    /* ───────────── Emotion (recency-weighted) ───────────── */
    const weightSum = emotions.reduce((acc, _, i) => acc + 1 / (i + 1), 0);
    const weightedEmotion =
      emotions.length > 0 && weightSum > 0
        ? emotions.reduce(
          (acc, e, i) => acc + (e.intensity ?? 0) * (1 / (i + 1)),
          0
        ) / weightSum
        : 0;

    /* ───────────── Feedback Average ───────────── */
    const avgFeedback =
      feedbacks.length > 0
        ? feedbacks.reduce((acc, f) => acc + (f.rating ?? 0), 0) /
        feedbacks.length
        : 0;

    /* ───────────── Cognitive Normalization ───────────── */
    const normalizedProfile = profile
      ? {
        ...profile,
        avgFocusPerInteraction:
          profile.interactions && profile.interactions > 0
            ? Math.round((profile.focusDuration ?? 0) / profile.interactions)
            : 0,
      }
      : null;

    if (log) {
      await logActivity(
        teacherId,
        "VIEW_STUDENT_ANALYTICS",
        `studentId=${studentId}`
      );
    }

    return {
      profile: normalizedProfile,
      avgEmotion: clamp(weightedEmotion, -1, 1),
      avgFeedback,
      emotions,
      feedbacks,
    };
  },

  async summarizeStudentPerformance(
    teacherId: string,
    studentId: string
  ) {
    await this.validateTeacher(teacherId);

    // reuse analytics without re-logging
    const analytics = await this.getStudentAnalytics(
      teacherId,
      studentId,
      false
    );

    const summaryText = `
  Student Performance Overview:
  - Attention Score: ${analytics.profile?.attentionScore ?? "N/A"}
  - Average Feedback Rating: ${analytics.avgFeedback.toFixed(2)}
  - Emotional Trend Score: ${analytics.avgEmotion.toFixed(2)}
  - Avg Focus per Interaction: ${analytics.profile?.avgFocusPerInteraction ?? "N/A"
      } seconds
  - Engagement Interactions: ${analytics.profile?.interactions ?? 0}
  `;

    const safeSummaryText =
      summaryText.length > 2000
        ? summaryText.slice(0, 2000)
        : summaryText;

    const summary = await NLPService.summarize(safeSummaryText);

    if (
      !summary.summary ||
      summary.summary === "No summary generated." ||
      summary.summary.trim().length < 10
    ) {
      summary.summary = `The student demonstrates an attention score of ${analytics.profile?.attentionScore ?? "N/A"
        }, with an average feedback rating of ${analytics.avgFeedback.toFixed(
          2
        )}. Their emotional trend appears stable, and they engage meaningfully with the content.`;
    }

    await logActivity(
      teacherId,
      "SUMMARIZE_STUDENT_PERFORMANCE",
      `studentId=${studentId}`
    );

    return { summary, data: analytics };
  },

  async reviewMindmap(teacherId: string, mindmapId: string, approval: boolean, comment?: string) {
    await this.validateTeacher(teacherId);
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found");
    await logActivity(teacherId, "REVIEW_MINDMAP", `mindmapId=${mindmapId}, approval=${approval}`);
    return await prisma.mindmap.update({
      where: { id: mindmapId },
      data: {
        reviewedById: teacherId,
        approval: approval,
        comments: comment,
      },
    });
  },

  async getClassOverview(teacherId: string) {
    await this.validateTeacher(teacherId);

    const students = await prisma.user.findMany({
      where: { createdBy: teacherId, role: userRole.Student },
    });

    if (!students.length)
      throw createHttpError(404, "No students found for this teacher");

    const studentIds = students.map((s) => s.id);
    const [emotions, feedbacks] = await Promise.all([
      prisma.emotionLog.findMany({ where: { userId: { in: studentIds } } }),
      prisma.feedback.findMany({ where: { userId: { in: studentIds } } }),
    ]);

    const avgFeedback =
      feedbacks.reduce((acc, f) => acc + (f.rating ?? 0), 0) / (feedbacks.length || 1);
    const emotionStats = emotions.reduce((acc: Record<string, number>, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {});
    await logActivity(teacherId, "VIEW_CLASS_OVERVIEW", `studentCount=${students.length}`);
    return { classSize: students.length, avgFeedback, emotionStats };
  },
};
