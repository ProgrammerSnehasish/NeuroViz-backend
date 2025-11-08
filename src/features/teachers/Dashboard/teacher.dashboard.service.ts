import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { NLPService } from "../../nlp/nlp.service";

export const TeacherDashboardService = {
  // Validate teacher role
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true },
    });

    if (!user) throw createHttpError(404, "User not found");
    if (user.role !== "TEACHER" && !user.teacherProfile)
      throw createHttpError(403, "Access denied: not a teacher.");

    return user;
  },

  // Dashboard Overview
  async getDashboardOverview(teacherId: string) {
    await this.validateTeacher(teacherId);

    // Find all students created/linked by this teacher
    const students = await prisma.user.findMany({
      where: {
        createdBy: teacherId,
        role: "STUDENT",
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

    return { emotions, cognition, feedbacks };
  },

  async getClassHeatmap(teacherId: string) {
    await this.validateTeacher(teacherId);

    const students = await prisma.user.findMany({
      where: { createdBy: teacherId, role: "STUDENT" },
      select: { id: true },
    });
    const studentIds = students.map(s => s.id);

    const emotions = await prisma.emotionLog.findMany({ where: { userId: { in: studentIds } } });
    const cognition = await prisma.cognitiveProfile.findMany({ where: { userId: { in: studentIds } } });

    const emotionCounts = emotions.reduce((acc: any, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {});

    const avgCognitiveEngagement = cognition.reduce((a, c) => a + (c.attentionScore ?? 0), 0) / (cognition.length || 1);

    return { heatmap: Object.entries(emotionCounts).map(([emotion, count]) => ({ emotion, count })), avgCognitiveEngagement };
  },

  async getStudentReport(teacherId: string, studentId: string) {
    const { emotions, cognition, feedbacks } = await this.getStudentProgress(teacherId, studentId);

    const combinedText = [
      ...feedbacks.map(f => f.feedback),
      ...emotions.map(e => `${e.emotion} (${e.intensity})`),
    ].join("\n");

    const summary = await NLPService.summarize(`Summarize student progress:\n${combinedText}`);
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
    return { strategies };
  },

  async getClassStrategy(teacherId: string) {
    await this.validateTeacher(teacherId);

    const students = await prisma.user.findMany({ where: { createdBy: teacherId, role: "STUDENT" }, select: { id: true } });
    const studentIds = students.map(s => s.id);
    const cognition = await prisma.cognitiveProfile.findMany({ where: { userId: { in: studentIds } } });

    const prompt = `
      Based on the cognitive and emotional data of ${studentIds.length} students:
      ${JSON.stringify(cognition)}.
      Suggest adaptive pacing or grouping strategies.
    `;
    const strategies = await NLPService.generate(prompt);
    return { strategies };
  },
  // Student Comparison
  async compareStudents(teacherId: string) {
    await this.validateTeacher(teacherId);
    const students = await prisma.user.findMany({
      where: { createdBy: teacherId, role: "STUDENT" },
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

    return { avgGrade, submissionRate, avgSentiment: sentiment.label, commonKeywords: keywords };
  },

  // Feedback Services
  async giveFeedback(teacherId: string, studentId: string, feedback: string) {
    return prisma.teacherFeedback.create({ data: { teacherId, studentId, feedback } });
  },

  async getFeedbackOverview(teacherId: string) {
    const feedbacks = await prisma.teacherFeedback.findMany({ where: { teacherId } });
    const combined = feedbacks.map(f => f.feedback).join("\n");
    const summary = await NLPService.summarize(`Summarize my feedback reflections:\n${combined}`);
    return { summary, count: feedbacks.length };
  },

  //Notification system
  async getNotifications(teacherId: string) {
    const notifications = await prisma.notification.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
    });

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

    return prisma.notification.create({
      data: {
        teacherId,
        title,
        message,
        isRead: false,
      },
    });
  },
};
