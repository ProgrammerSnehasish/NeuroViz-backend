import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { NLPService } from "../../nlp/nlp.service";
import { userRole } from "../../../config/core";

async function logActivity(
  userId: string | null | undefined,
  action: string,
  details?: string
) {
  if (!userId) return;

  try {
    await prisma.activityLog.create({
      data: { userId, action, details },
    });
  } catch (err) {
    console.error("⚠️ Failed to write activity log:", err);
  }
}

export const TeacherDashboardService = {
  // Validate teacher role
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true },
    });

    if (!user) throw createHttpError(404, "User not found");
    if (user.role !== userRole.Teacher && !user.teacherProfile)
    throw createHttpError(403, "Access denied: not a teacher.");

    return user;
  },

  // Dashboard Overview
  async getDashboardOverview(teacherId: string) {
    await this.validateTeacher(teacherId);

    // Find all students created/linked by this teacher
    const students = await prisma.user.findMany({
      where: {
        role: userRole.Student,
        OR: [
          { createdBy: teacherId },
          { createdBy: null },
          { createdBy: "" }, // for students with empty string createdBy
        ],
      },
      select: { id: true, firstName: true, lastName: true },
    });


    if (!students.length)
      throw createHttpError(404, "No students found under this teacher.");

    const studentIds = students.map((s) => s.id);

    const [feedbacks, emotions, cognitiveProfiles] = await Promise.all([
      prisma.feedback.findMany({ where: { userId: { in: studentIds } } }),
      prisma.emotionLog.findMany({ where: { userId: { in: studentIds } } }),
      prisma.cognitiveProfile.findMany({ where: { userId: { in: studentIds } } }),
    ]);

    const avgFeedback =
      feedbacks.reduce((a, f) => a + (f.rating ?? 0), 0) / (feedbacks.length || 1);

    const emotionCount = emotions.reduce((acc: Record<string, number>, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {});

    const avgAttention =
      cognitiveProfiles.reduce((a, p) => a + (p.attentionScore ?? 0), 0) /
      (cognitiveProfiles.length || 1);

    const avgFocus =
      cognitiveProfiles.reduce((a, p) => a + (p.focusDuration ?? 0), 0) /
      (cognitiveProfiles.length || 1);

    await logActivity(
      teacherId,
      "VIEW_DASHBOARD_OVERVIEW",
      `students=${students.length}`
    );
    return {
      classSize: students.length,
      avgFeedback: Number(avgFeedback.toFixed(2)),
      avgAttention: Number(avgAttention.toFixed(2)),
      avgFocusDuration: Math.round(avgFocus),
      emotionDistribution: emotionCount,
    };
  },

  //Analytics Services
  async getStudentProgress(teacherId: string, studentId: string) {
    await this.validateTeacher(teacherId);

    const [emotions, cognition, feedbacks] = await Promise.all([
      prisma.emotionLog.findMany({ where: { userId: studentId }, orderBy: { createdAt: "asc" } }),
      prisma.cognitiveProfile.findMany({ where: { userId: studentId }, orderBy: { createdAt: "asc" } }),
      prisma.teacherFeedback.findMany({ where: { studentId }, orderBy: { createdAt: "asc" } }),
    ]);
    await logActivity(
      teacherId,
      "VIEW_STUDENT_PROGRESS",
      `studentId=${studentId}`
    );
    return { emotions, cognition, feedbacks };
  },

  async getClassHeatmap(teacherId: string) {
    await this.validateTeacher(teacherId);

    const students = await prisma.user.findMany({
      where: {
        role: userRole.Student,
        OR: [
          { createdBy: teacherId },
          { createdBy: null },
          { createdBy: "" },
          { studentTeachers: { some: { teacherId } } }, // include linked students too
        ],
      },
      select: { id: true },
    });

    const studentIds = students.map((s) => s.id);

    if (!studentIds.length)
      return { heatmap: [], avgCognitiveEngagement: 0 };

    const [emotions, cognition] = await Promise.all([
      prisma.emotionLog.findMany({ where: { userId: { in: studentIds } } }),
      prisma.cognitiveProfile.findMany({ where: { userId: { in: studentIds } } }),
    ]);

    const emotionCounts = emotions.reduce((acc: Record<string, number>, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {});

    const avgCognitiveEngagement =
      cognition.reduce((a, c) => a + (c.attentionScore ?? 0), 0) /
      (cognition.length || 1);

    await logActivity(
      teacherId,
      "VIEW_CLASS_HEATMAP",
      `students=${studentIds.length}`
    );

    return {
      heatmap: Object.entries(emotionCounts).map(([emotion, count]) => ({
        emotion,
        count,
      })),
      avgCognitiveEngagement: Number(avgCognitiveEngagement.toFixed(2)),
    };
  },
  async getStudentReport(teacherId: string, studentId: string) {
    const { emotions, cognition, feedbacks } = await this.getStudentProgress(teacherId, studentId);

    const combinedText = [
      ...feedbacks.map(f => f.feedback),
      ...emotions.map(e => `${e.emotion} (${e.intensity})`),
    ].join("\n");

    const summary = await NLPService.summarize(`Summarize student progress:\n${combinedText}`);
    await logActivity(
      teacherId,
      "GET_STUDENT_REPORT",
      `studentId=${studentId}`
    );
    return { summary, emotions, cognition };
  },

  //Adaptive Learning Recommendations
  async getStudentStrategy(teacherId: string, studentId: string) {
    await this.validateTeacher(teacherId);
    const [emotions, cognition, feedbacks] = await Promise.all([
      prisma.emotionLog.findMany({ where: { userId: studentId } }),
      prisma.cognitiveProfile.findMany({ where: { userId: studentId } }),
      prisma.teacherFeedback.findMany({ where: { studentId } }),
    ]);

    const prompt = `
      Based on student emotion trends (${JSON.stringify(emotions)}),
      cognitive profile (${JSON.stringify(cognition)}),
      and feedbacks (${feedbacks.map(f => f.feedback).join("; ")}),
      suggest 3 personalized teaching strategies.
    `;

    const strategies = await NLPService.generate(prompt);
    await logActivity(
      teacherId,
      "GET_STUDENT_STRATEGY",
      `studentId=${studentId}`
    );
    return { strategies };
  },

  async getClassStrategy(teacherId: string) {
    await this.validateTeacher(teacherId);

    const students = await prisma.user.findMany({ where: { createdBy: teacherId, role: userRole.Student }, select: { id: true } });
    const studentIds = students.map(s => s.id);
    const cognition = await prisma.cognitiveProfile.findMany({ where: { userId: { in: studentIds } } });

    const prompt = `
      Based on the cognitive and emotional data of ${studentIds.length} students:
      ${JSON.stringify(cognition)}.
      Suggest adaptive pacing or grouping strategies.
    `;
    const strategies = await NLPService.generate(prompt);
    await logActivity(
      teacherId,
      "GET_CLASS_STRATEGY",
      `students=${studentIds.length}`
    );
    return { strategies };
  },
  // Student Comparison
  async compareStudents(teacherId: string) {
    await this.validateTeacher(teacherId);

    // Fetch students linked to this teacher, including linked students
    const students = await prisma.user.findMany({
      where: {
        role: userRole.Student,
        OR: [
          { createdBy: teacherId },
          { createdBy: null },
          { createdBy: "" },
          { studentTeachers: { some: { teacherId } } },
        ],
      },
      include: {
        cognitive: true,
        feedbacks: true,
      },
    });

    if (!students.length) {
      throw createHttpError(404, "No students found under this teacher.");
    }

    const studentComparisons = students.map((student) => {
      const avgRating =
        student.feedbacks.reduce((a, f) => a + (f.rating ?? 0), 0) /
        (student.feedbacks.length || 1);

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        attention: student.cognitive?.attentionScore ?? null,
        focusDuration: student.cognitive?.focusDuration ?? null,
        avgFeedback: Number(avgRating.toFixed(2)),
      };
    });

    const prompt = `
    Compare and summarize these students' performance based on attention,
    focus duration, and feedback averages:
    ${JSON.stringify(studentComparisons, null, 2)}.
    Highlight top performers, improvement areas, and any overall class trends.
  `;

    const aiSummary = await NLPService.summarize(prompt);
    await logActivity(
      teacherId,
      "COMPARE_STUDENTS",
      `students=${students.length}`
    );
    return { students: studentComparisons, aiSummary };
  },
  // AI-Based Adaptive Insights for Teaching
  async getAdaptiveTeachingInsights(teacherId: string) {
    const overview = await this.getDashboardOverview(teacherId);

    const input = `
      The class has ${overview.classSize} students.
      The average feedback score is ${overview.avgFeedback}.
      The average attention score is ${overview.avgAttention}.
      The average focus duration is ${overview.avgFocusDuration} seconds.
      Emotion distribution: ${JSON.stringify(overview.emotionDistribution)}.
      Generate short insights and adaptive strategies for improving teaching effectiveness.
    `;

    const insights = await NLPService.summarize(input);
    await logActivity(
      teacherId,
      "GET_ADAPTIVE_TEACHING_INSIGHTS",
      `classSize=${overview.classSize}`
    );
    return { insights, metrics: overview };
  },

  // AI-Based Adaptive Insights for Assignments
  async getAssignmentInsights(teacherId: string) {
    const assignments = await prisma.assignment.findMany({ where: { teacherId }, include: { submissions: true } });
    const allSubmissions = assignments.flatMap(a => a.submissions);

    const avgGrade = allSubmissions.reduce((a, s) => a + (s.grade ?? 0), 0) / (allSubmissions.length || 1);
    const submissionRate = allSubmissions.filter(s => s.status === "SUBMITTED").length / (allSubmissions.length || 1);

    const allText = allSubmissions.map(s => s.feedback ?? "").join("\n");
    const sentiment = await NLPService.sentiment(allText);
    const keywords = await NLPService.keywords(allText);
    await logActivity(
      teacherId,
      "GET_ASSIGNMENT_INSIGHTS",
      `assignments=${assignments.length}, submissions=${allSubmissions.length}`
    );
    return { avgGrade, submissionRate, avgSentiment: sentiment.label, commonKeywords: keywords };
  },

  // Feedback Services
  async giveFeedback(teacherId: string, studentId: string, feedback: string) {
    const feed = await prisma.teacherFeedback.create({ data: { teacherId, studentId, feedback } });
    await logActivity(
      teacherId,
      "GIVE_FEEDBACK",
      `studentId=${studentId}, feedbackId=${feed.id}`
    );
    return feed;
  },

  async getFeedbackOverview(teacherId: string) {
    const feedbacks = await prisma.teacherFeedback.findMany({ where: { teacherId } });
    const combined = feedbacks.map(f => f.feedback).join("\n");
    const summary = await NLPService.summarize(`Summarize my feedback reflections:\n${combined}`);
    await logActivity(
      teacherId,
      "VIEW_FEEDBACK_OVERVIEW",
      `feedbackCount=${feedbacks.length}`
    );
    return { summary, count: feedbacks.length };
  },

  //Notification system
  async getNotifications(teacherId: string) {
    const notifications = await prisma.notification.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
    });

    await logActivity(
      teacherId,
      "VIEW_NOTIFICATIONS",
      `notificationCount=${notifications.length}`
    );

    if (!notifications || notifications.length === 0) {
      throw createHttpError(404, "No notifications found for this teacher.");
    }

    return notifications;
  },

  // Mark a notification as read
  async markRead(id: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      throw createHttpError(404, "Notification not found.");
    }

    if (notification.isRead) {
      throw createHttpError(400, "Notification is already marked as read.");
    }

    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  },

  // Post a new notification for a teacher
  async postNotification(teacherId: string, title: string, message: string) {
    if (!title || !message) {
      throw createHttpError(400, "Notification title and message are required.");
    }

    const notification = await prisma.notification.create({
      data: {
        teacherId,
        title,
        message,
        isRead: false,
      },
    });

    await logActivity(
      teacherId,
      "POST_NOTIFICATION",
      `notificationId=${notification.id}`
    );
    return notification;
  },
};
