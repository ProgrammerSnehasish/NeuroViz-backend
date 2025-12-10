import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { NLPService } from "../../nlp/nlp.service";

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
    if (user.role !== "TEACHER")
      throw createHttpError(403, "Access denied. Only teachers are allowed.");
    return user;
  },

  async validateStudent(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    if (!user) throw createHttpError(404, "Student not found");
    if (user.role !== "STUDENT")
      throw createHttpError(403, "Target user is not a student");
    return user;
  },

  async getStudentAnalytics(teacherId: string, studentId: string) {
    await this.validateTeacher(teacherId);
    await this.validateStudent(studentId);

    const [profile, emotions, feedbacks] = await Promise.all([
      prisma.cognitiveProfile.findUnique({ where: { userId: studentId } }),
      prisma.emotionLog.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.feedback.findMany({ where: { userId: studentId } }),
    ]);

    const avgEmotion =
      emotions.length > 0
        ? emotions.reduce((acc, e) => acc + (e.intensity || 0), 0) / emotions.length
        : 0;
    const avgFeedback =
      feedbacks.length > 0
        ? feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.length
        : 0;
    await logActivity(teacherId, "VIEW_STUDENT_ANALYTICS", `studentId=${studentId}`);
    return { profile, avgEmotion, avgFeedback, emotions, feedbacks };
  },

  async summarizeStudentPerformance(teacherId: string, studentId: string) {
  await this.validateTeacher(teacherId);
  const analytics = await this.getStudentAnalytics(teacherId, studentId);

  const summaryText = `
    Student Performance Overview:
    - Attention Score: ${analytics.profile?.attentionScore ?? "N/A"}
    - Average Feedback Rating: ${analytics.avgFeedback.toFixed(2)}
    - Recent Emotion: ${analytics.emotions[0]?.emotion ?? "neutral"}
    - Average Focus Duration: ${analytics.profile?.focusDuration ?? "N/A"} seconds
    - Engagement Interactions: ${analytics.profile?.interactions ?? 0}
  `;

  const summary = await NLPService.summarize(summaryText);

  if (
    !summary.summary ||
    summary.summary === "No summary generated." ||
    summary.summary.trim().length < 10
  ) {
    summary.summary = `The student shows an average attention score of ${analytics.profile?.attentionScore ?? "N/A"} and a feedback rating of ${analytics.avgFeedback.toFixed(2)}. Their emotional state appears ${analytics.emotions[0]?.emotion ?? "neutral"}, with an average focus duration of ${analytics.profile?.focusDuration ?? "N/A"} seconds.`;
  }
  await logActivity(teacherId, "SUMMARIZE_STUDENT_PERFORMANCE", `studentId=${studentId}`);
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
      where: { createdBy: teacherId, role: "STUDENT" },
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
