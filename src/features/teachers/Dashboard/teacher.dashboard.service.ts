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
    await prisma.activityLog.create({ data: { userId, action, details } });
  } catch (err) {
    console.error("⚠️ Failed to write activity log:", err);
  }
}

function parseAIJson(response: string) {
  try {
    const cleaned = response
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^Here is the JSON output:\s*/i, "")
      .replace(/^Here is the JSON:\s*/i, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("No JSON found");
    }

    return JSON.parse(cleaned.substring(start, end + 1));
  } catch (err) {
    return {
      error: "Failed to parse AI response",
      raw: response,
    };
  }
}

function sanitizeAIResponse(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "")          // remove code blocks
    .replace(/\*\*/g, "")                    // remove bold
    .replace(/#{1,6}\s*/g, "")               // remove markdown headings
    .replace(/\n{3,}/g, "\n\n")              // collapse blank lines
    .replace(/\s+/g, " ")
    .replace(/\n /g, "\n")
    .trim();
}

export const TeacherDashboardService = {
  // ─── Validate teacher role ────────────────────────────────────────────────
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

  // ─── Helper: fetch all student IDs linked to a teacher ───────────────────
  async _getLinkedStudentIds(teacherId: string): Promise<string[]> {
    const students = await prisma.user.findMany({
      where: {
        role: userRole.Student,
        OR: [
          { createdBy: teacherId },
          { studentTeachers: { some: { teacherId } } },
        ],
      },
      select: { id: true },
    });
    return students.map((s) => s.id);
  },

  // ─── CLASS STATS (Home Dashboard) ────────────────────────────────────────
  /**
   * Returns all KPIs needed for the Class Stats home page:
   * totalStudents, activeToday, assignmentsPending, avgFocusPct,
   * emotionDistribution, avgFeedback, avgAttention
   */
  async getDashboardOverview(teacherId: string) {
    await this.validateTeacher(teacherId);

    const studentIds = await this._getLinkedStudentIds(teacherId);
    if (!studentIds.length)
      throw createHttpError(404, "No students found under this teacher.");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      feedbacks,
      emotions,
      cognitiveProfiles,
      activeSessions,
      pendingSubmissions,
    ] = await Promise.all([
      prisma.feedback.findMany({ where: { userId: { in: studentIds } } }),
      prisma.emotionLog.findMany({ where: { userId: { in: studentIds } } }),
      prisma.cognitiveProfile.findMany({ where: { userId: { in: studentIds } } }),
      // "Active Today" = students who logged an emotion or session today
      prisma.emotionLog.findMany({
        where: {
          userId: { in: studentIds },
          createdAt: { gte: oneDayAgo },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
      // "Assignments Pending" = submissions not yet graded
      prisma.assignmentSubmission.count({
        where: {
          studentId: { in: studentIds },
          grade: null,
          status: "SUBMITTED",
        },
      }),
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

    const avgFocusRaw =
      cognitiveProfiles.reduce((a, p) => a + (p.focusDuration ?? 0), 0) /
      (cognitiveProfiles.length || 1);

    // Normalise focusDuration to a 0-100% scale (assume max meaningful = 3600 s)
    const MAX_FOCUS_SECONDS = 3600;
    const avgFocusPct = Math.min(
      100,
      Math.round((avgFocusRaw / MAX_FOCUS_SECONDS) * 100)
    );

    await logActivity(teacherId, "VIEW_DASHBOARD_OVERVIEW", `students=${studentIds.length}`);

    return {
      totalStudents: studentIds.length,
      activeToday: activeSessions.length,
      assignmentsPending: pendingSubmissions,
      avgFocusPct,                                    // e.g. 82 → "82%"
      avgFeedback: Number(avgFeedback.toFixed(2)),
      avgAttention: Number(avgAttention.toFixed(2)),
      avgFocusDuration: Math.round(avgFocusRaw),      // raw seconds kept for other uses
      emotionDistribution: emotionCount,
    };
  },

  // ─── ANALYTICS & STRATEGY ────────────────────────────────────────────────
  /**
   * Returns KPIs for the Analytics & Strategy page:
   * avgEngagement (%), cognitiveLoad (%), activeSessions,
   * aiInsightsCount, weeklyEngagementTrend[]
   */
  async getAnalyticsOverview(teacherId: string) {
    await this.validateTeacher(teacherId);

    const studentIds = await this._getLinkedStudentIds(teacherId);
    if (!studentIds.length)
      throw createHttpError(404, "No students found under this teacher.");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [cognitiveProfiles, emotionLogs, weeklyEmotions, aiInsightsCount] =
      await Promise.all([
        prisma.cognitiveProfile.findMany({ where: { userId: { in: studentIds } } }),
        prisma.emotionLog.findMany({ where: { userId: { in: studentIds } } }),
        prisma.emotionLog.findMany({
          where: {
            userId: { in: studentIds },
            createdAt: { gte: sevenDaysAgo },
          },
          orderBy: { createdAt: "asc" },
        }),
        // Count of AI-generated insights/strategies this week
        prisma.activityLog.count({
          where: {
            userId: teacherId,
            action: {
              in: [
                "GET_STUDENT_STRATEGY",
                "GET_CLASS_STRATEGY",
                "GET_ADAPTIVE_TEACHING_INSIGHTS",
              ],
            },
            createdAt: { gte: sevenDaysAgo },
          },
        }),
      ]);

    // avgEngagement = mean attention score as percentage (0-100)
    const avgEngagement =
      cognitiveProfiles.length > 0
        ? Math.round(
          cognitiveProfiles.reduce((a, p) => a + (p.attentionScore ?? 0), 0) /
          cognitiveProfiles.length
        )
        : 0;

    // cognitiveLoad = inverse of avgEngagement, clamped to 0-100
    // (a simple heuristic; replace with your own model if needed)
    const cognitiveLoad = Math.min(100, Math.round(100 - avgEngagement * 0.3));

    // activeSessions = distinct students with any emotion log in last 7 days
    const activeSessionStudents = new Set(weeklyEmotions.map((e) => e.userId));

    // Build a 7-day engagement trend (count of active students per day)
    const trendMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      trendMap[key] = 0;
    }
    weeklyEmotions.forEach((e) => {
      const key = e.createdAt.toISOString().slice(0, 10);
      if (key in trendMap) trendMap[key] += 1;
    });
    const weeklyEngagementTrend = Object.entries(trendMap).map(
      ([date, count]) => ({ date, count })
    );

    await logActivity(teacherId, "VIEW_ANALYTICS_OVERVIEW", `students=${studentIds.length}`);

    return {
      avgEngagement,                          // e.g. 82 → "82%"
      cognitiveLoad,                          // e.g. 74 → "74%"
      activeSessions: activeSessionStudents.size,
      aiInsightsCount,                        // new this week
      weeklyEngagementTrend,
    };
  },

  // ─── STUDENT PROGRESS (per student) ──────────────────────────────────────
  async getStudentProgress(teacherId: string, studentId: string) {
    await this.validateTeacher(teacherId);

    const [emotions, cognition, feedbacks] = await Promise.all([
      prisma.emotionLog.findMany({ where: { userId: studentId }, orderBy: { createdAt: "asc" } }),
      prisma.cognitiveProfile.findMany({ where: { userId: studentId }, orderBy: { createdAt: "asc" } }),
      prisma.teacherFeedback.findMany({ where: { studentId }, orderBy: { createdAt: "asc" } }),
    ]);

    await logActivity(teacherId, "VIEW_STUDENT_PROGRESS", `studentId=${studentId}`);
    return { emotions, cognition, feedbacks };
  },

  // ─── CLASS HEATMAP ────────────────────────────────────────────────────────
  async getClassHeatmap(teacherId: string) {
    await this.validateTeacher(teacherId);

    const studentIds = await this._getLinkedStudentIds(teacherId);
    if (!studentIds.length) return { heatmap: [], avgCognitiveEngagement: 0 };

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

    await logActivity(teacherId, "VIEW_CLASS_HEATMAP", `students=${studentIds.length}`);

    return {
      heatmap: Object.entries(emotionCounts).map(([emotion, count]) => ({ emotion, count })),
      avgCognitiveEngagement: Number(avgCognitiveEngagement.toFixed(2)),
    };
  },

  // ─── STUDENT REPORT ───────────────────────────────────────────────────────
  async getStudentReport(teacherId: string, studentId: string) {
    const { emotions, cognition, feedbacks } = await this.getStudentProgress(teacherId, studentId);

    const combinedText = [
      ...feedbacks.map((f) => f.feedback),
      ...emotions.map((e) => `${e.emotion} (${e.intensity})`),
    ].join("\n");

    const summary = await NLPService.summarize(`Summarize student progress:\n${combinedText}`);
    await logActivity(teacherId, "GET_STUDENT_REPORT", `studentId=${studentId}`);
    return { summary, emotions, cognition };
  },

  // ─── ADAPTIVE LEARNING RECOMMENDATIONS ───────────────────────────────────
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
      and feedbacks (${feedbacks.map((f) => f.feedback).join("; ")}),
      suggest 3 personalized teaching strategies.
    `;

    const aiResponse = await NLPService.generate(prompt);
    const strategies = sanitizeAIResponse(aiResponse);
    await logActivity(teacherId, "GET_STUDENT_STRATEGY", `studentId=${studentId}`);
    return { strategies };
  },

  async getClassStrategy(teacherId: string) {
    await this.validateTeacher(teacherId);

    const studentIds = await this._getLinkedStudentIds(teacherId);
    const cognition = await prisma.cognitiveProfile.findMany({
      where: { userId: { in: studentIds } },
    });

    const prompt = `
      Based on the cognitive and emotional data of ${studentIds.length} students:
      ${JSON.stringify(cognition)}.
      Suggest adaptive pacing or grouping strategies.
    `;

    const aiResponse = await NLPService.generate(prompt);
    const strategies = sanitizeAIResponse(aiResponse);
    await logActivity(teacherId, "GET_CLASS_STRATEGY", `students=${studentIds.length}`);
    return { strategies };
  },

  // ─── STUDENT COMPARISON ───────────────────────────────────────────────────
  async compareStudents(teacherId: string) {
    await this.validateTeacher(teacherId);

    const studentIds = await this._getLinkedStudentIds(teacherId);
    if (!studentIds.length)
      throw createHttpError(404, "No students found under this teacher.");

    const students = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      include: { cognitive: true, feedbacks: true },
    });

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
You are an educational performance analyst.

Analyze these students.

${JSON.stringify(studentComparisons, null, 2)}

Return ONLY JSON.

{
  "classSummary": "...",
  "topPerformers": [
    {
      "name": "",
      "reason": ""
    }
  ],
  "needsAttention": [
    {
      "name": "",
      "reason": ""
    }
  ],
  "recommendations": [
    "...",
    "...",
    "..."
  ]
}

Rules:
- Compare attention, focus duration, and feedback.
- Ignore missing values instead of treating them as zero.
- Mention if insufficient data exists.
- Keep recommendations practical.
`;

    const aiResponse = await NLPService.generate(prompt);
    const aiSummary = parseAIJson(aiResponse);
    await logActivity(teacherId, "COMPARE_STUDENTS", `students=${students.length}`);
    return { students: studentComparisons, aiSummary };
  },

  // ─── ADAPTIVE TEACHING INSIGHTS ───────────────────────────────────────────
  async getAdaptiveTeachingInsights(teacherId: string) {
    const overview = await this.getDashboardOverview(teacherId);

    const prompt = `
You are an AI teaching assistant.

Analyze the classroom analytics below and generate practical teaching insights.

Class Data:
- Total Students: ${overview.totalStudents}
- Average Feedback Rating: ${overview.avgFeedback}/5
- Average Attention Score: ${overview.avgAttention}/5
- Average Focus Duration: ${overview.avgFocusDuration} seconds
- Emotion Distribution:
${JSON.stringify(overview.emotionDistribution)}

Return ONLY JSON in the following format:

{
  "overallPerformance": "...",
  "strengths": [
    "...",
    "..."
  ],
  "concerns": [
    "...",
    "..."
  ],
  "recommendations": [
    "...",
    "...",
    "..."
  ],
  "teacherAction": "...",
  "priority": "Low | Medium | High"
}

Rules:
- Do not repeat the numbers.
- Interpret what they mean.
- Give actionable recommendations.
- Keep each point under 20 words.
`;

    const aiResponse = await NLPService.generate(prompt);
    const insights = parseAIJson(aiResponse);
    await logActivity(teacherId, "GET_ADAPTIVE_TEACHING_INSIGHTS", `classSize=${overview.totalStudents}`);
    return { insights, metrics: overview };
  },

  // ─── ASSIGNMENT INSIGHTS ──────────────────────────────────────────────────
  async getAssignmentInsights(teacherId: string) {
    const assignments = await prisma.assignment.findMany({
      where: { teacherId },
      include: { submissions: true },
    });
    const allSubmissions = assignments.flatMap((a) => a.submissions);

    const avgGrade =
      allSubmissions.reduce((a, s) => a + (s.grade ?? 0), 0) / (allSubmissions.length || 1);
    const submissionRate =
      allSubmissions.filter((s) => s.status === "SUBMITTED").length /
      (allSubmissions.length || 1);

    const allText = allSubmissions.map((s) => s.feedback ?? "").join("\n");
    const sentiment = await NLPService.sentiment(allText);
    const keywords = await NLPService.keywords(allText);

    await logActivity(
      teacherId,
      "GET_ASSIGNMENT_INSIGHTS",
      `assignments=${assignments.length}, submissions=${allSubmissions.length}`
    );
    return { avgGrade, submissionRate, avgSentiment: sentiment.label, commonKeywords: keywords };
  },

  // ─── FEEDBACK SERVICES ────────────────────────────────────────────────────
  async giveFeedback(teacherId: string, studentId: string, feedback: string) {
    // 1. Verify the teacher-student relationship exists
    const relationship = await prisma.teacherStudent.findUnique({
      where: {
        UniqueTeacherStudent: { teacherId, studentId },
      },
    });

    if (!relationship) {
      throw new Error(
        `No teacher-student relationship found for teacherId=${teacherId}, studentId=${studentId}`
      );
    }

    // 2. Now safe to create — studentId is guaranteed to exist in User
    const feed = await prisma.teacherFeedback.create({
      data: { teacherId, studentId, feedback },
    });

    await logActivity(
      teacherId,
      "GIVE_FEEDBACK",
      `studentId=${studentId}, feedbackId=${feed.id}`
    );

    return feed;
  },

  async getFeedbackOverview(teacherId: string) {
    const feedbacks = await prisma.teacherFeedback.findMany({ where: { teacherId } });
    const combined = feedbacks.map((f) => f.feedback).join("\n");
    const summary = await NLPService.summarize(`Summarize my feedback reflections:\n${combined}`);
    await logActivity(teacherId, "VIEW_FEEDBACK_OVERVIEW", `feedbackCount=${feedbacks.length}`);
    return { summary, count: feedbacks.length };
  },

  // ─── NOTIFICATION SYSTEM ──────────────────────────────────────────────────
  /**
   * Returns paginated notifications + the 4 KPI counts shown on the
   * Notifications & Feedback page: total, unread, studentFeedback, alerts
   */
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

    if (!notifications.length)
      throw createHttpError(404, "No notifications found for this teacher.");

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    const studentFeedbackCount = notifications.filter(
      (n) => n.type === "STUDENT_FEEDBACK"
    ).length;
    const alertsCount = notifications.filter((n) => n.type === "ALERT").length;

    return {
      total: notifications.length,
      unread: unreadCount,
      studentFeedback: studentFeedbackCount,
      alerts: alertsCount,
      notifications,
    };
  },

  async markRead(id: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw createHttpError(404, "Notification not found.");
    if (notification.isRead) throw createHttpError(400, "Notification is already marked as read.");
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  },

  async markAllRead(teacherId: string) {
    await this.validateTeacher(teacherId);
    await prisma.notification.updateMany({
      where: { teacherId, isRead: false },
      data: { isRead: true },
    });
    await logActivity(teacherId, "MARK_ALL_NOTIFICATIONS_READ");
    return { message: "All notifications marked as read." };
  },

  async postNotification(teacherId: string, title: string, message: string) {
    if (!title || !message)
      throw createHttpError(400, "Notification title and message are required.");

    const notification = await prisma.notification.create({
      data: { teacherId, title, message, isRead: false },
    });

    await logActivity(teacherId, "POST_NOTIFICATION", `notificationId=${notification.id}`);
    return notification;
  },

  /**
   * Broadcast an announcement to all linked students as notifications.
   * Maps to the "Broadcast Announcement" button on the Notifications page.
   */
  async broadcastAnnouncement(teacherId: string, title: string, message: string) {
    await this.validateTeacher(teacherId);
    if (!title || !message)
      throw createHttpError(400, "Title and message are required for a broadcast.");

    const studentIds = await this._getLinkedStudentIds(teacherId);
    if (!studentIds.length)
      throw createHttpError(404, "No students to broadcast to.");

    await prisma.notification.createMany({
      data: studentIds.map((studentId) => ({
        studentId,
        title,
        message,
        type: "ANNOUNCEMENT",
        isRead: false,
      })),
    });

    await logActivity(
      teacherId,
      "BROADCAST_ANNOUNCEMENT",
      `students=${studentIds.length}, title=${title}`
    );
    return { message: `Announcement broadcast to ${studentIds.length} students.` };
  },
};