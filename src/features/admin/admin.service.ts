import { userRole } from "../../config/core";
import prisma from "../../config/database";
import createHttpError from "http-errors";
import os from "os";
import { sendNewsletterMail } from "../../utils/newsletterMailer";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function logActivity(userId: string, action: string, details?: string) {
  try {
    await prisma.activityLog.create({ data: { userId, action, details } });
  } catch (err) {
    console.error("⚠️ Failed to write activity log:", err);
  }
}

const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
  gender: true,
  profilePhoto: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
} as const;

const safeFeedbackSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  rating: true,
  status: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────

export const AdminService = {

  // ── Verify admin ───────────────────────────────────────────────────────────
  async validateAdmin(userId: string) {
    const admin = await prisma.user.findUnique({ where: { id: userId } });
    if (!admin || admin.role !== userRole.Admin)
      throw createHttpError(403, "Access denied. Admin only.");
    return admin;
  },

  // ── Dashboard Overview ─────────────────────────────────────────────────────
  async getSystemOverview() {
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      activeUsers,
      totalMindmaps,
      approvedMindmaps,
      pendingMindmaps,
      totalAssignments,
      totalSubmissions,
      totalFeedbacks,
      pendingFeedbacks,
      totalNewsletterSubscribers,
      activeSubscribers,
      cognitiveAvg,
      emotionCounts,
      totalGroups,
      totalNotifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.mindmap.count(),
      prisma.mindmap.count({ where: { approval: true } }),
      prisma.mindmap.count({ where: { reviewedById: null } }),
      prisma.assignment.count(),
      prisma.assignmentSubmission.count(),
      prisma.siteFeedback.count(),
      prisma.siteFeedback.count({ where: { status: "PENDING" } }),
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { isSubscribed: true } }),
      prisma.cognitiveProfile.aggregate({ _avg: { attentionScore: true } }),
      prisma.emotionLog.groupBy({ by: ["emotion"], _count: { emotion: true } }),
      prisma.group.count(),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    return {
      users: {
        total: totalUsers,
        students: totalStudents,
        teachers: totalTeachers,
        admins: totalAdmins,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      mindmaps: {
        total: totalMindmaps,
        approved: approvedMindmaps,
        pending: pendingMindmaps,
        rejected: totalMindmaps - approvedMindmaps - pendingMindmaps,
      },
      assignments: {
        total: totalAssignments,
        submissions: totalSubmissions,
      },
      feedback: {
        total: totalFeedbacks,
        pending: pendingFeedbacks,
      },
      newsletter: {
        totalSubscribers: totalNewsletterSubscribers,
        activeSubscribers,
        unsubscribed: totalNewsletterSubscribers - activeSubscribers,
      },
      cognitive: {
        avgAttentionScore: cognitiveAvg._avg.attentionScore ?? 0,
      },
      emotions: Object.fromEntries(
        emotionCounts.map((e) => [e.emotion, e._count.emotion])
      ),
      groups: totalGroups,
      unreadNotifications: totalNotifications,
    };
  },

  // ── System Health ──────────────────────────────────────────────────────────
  async getSystemHealth() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ── DB health check ──
    let dbStatus = "healthy";
    let dbLatencyMs = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = "unhealthy";
    }

    const [
      activityToday,
      activityThisWeek,
      newUsersToday,
      newUsersThisWeek,
      newMindmapsToday,
      submissionsToday,
      failedMailsToday,
      sentMailsToday,
    ] = await Promise.all([
      prisma.activityLog.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.activityLog.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.user.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.mindmap.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.assignmentSubmission.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.mailLog.count({ where: { status: "FAILED", sentAt: { gte: last24Hours } } }),
      prisma.mailLog.count({ where: { status: "SENT", sentAt: { gte: last24Hours } } }),
    ]);

    // ── Server stats ──
    const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
    const usedMemoryMB = totalMemoryMB - freeMemoryMB;
    const memoryUsagePct = Math.round((usedMemoryMB / totalMemoryMB) * 100);
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();

    return {
      status: dbStatus === "healthy" ? "operational" : "degraded",
      server: {
        uptime: Math.round(process.uptime()),
        uptimeFormatted: formatUptime(process.uptime()),
        platform: os.platform(),
        cpuCount,
        loadAvg: {
          "1m": loadAvg[0].toFixed(2),
          "5m": loadAvg[1].toFixed(2),
          "15m": loadAvg[2].toFixed(2),
        },
        memory: {
          totalMB: totalMemoryMB,
          usedMB: usedMemoryMB,
          freeMB: freeMemoryMB,
          usagePercent: memoryUsagePct,
        },
        nodeVersion: process.version,
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      activity: {
        today: activityToday,
        thisWeek: activityThisWeek,
      },
      users: {
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
      },
      mindmaps: {
        newToday: newMindmapsToday,
      },
      submissions: {
        today: submissionsToday,
      },
      mail: {
        sentToday: sentMailsToday,
        failedToday: failedMailsToday,
      },
      timestamp: new Date().toISOString(),
    };
  },

  // ── Activity Logs ──────────────────────────────────────────────────────────
  async getActivityLogs(filters: {
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    const { userId, action, from, to, limit = 50, offset = 0 } = filters;

    const where: any = {
      ...(userId && { userId }),
      ...(action && { action: { contains: action, mode: "insensitive" } }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  },

  // ── Get users with filters ─────────────────────────────────────────────────
  async getAllUsers(filters: {
    role?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { role, isActive, search, limit = 50, offset = 0 } = filters;

    const where: any = {
      ...(role && { role: role as any }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: safeUserSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, limit, offset };
  },

  // ── Get single user ────────────────────────────────────────────────────────
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });
    if (!user) throw createHttpError(404, "User not found.");
    return user;
  },

  // ── Update user status ─────────────────────────────────────────────────────
  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found.");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: safeUserSelect,
    });

    return {
      message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
      user: updated,
    };
  },

  // ── Delete user ────────────────────────────────────────────────────────────
  async deleteUser(adminId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found.");
    if (user.role === userRole.Admin)
      throw createHttpError(403, "Cannot delete another admin.");

    await prisma.user.delete({ where: { id: userId } });
    await logActivity(adminId, "ADMIN_DELETE_USER", `Deleted userId=${userId}`);

    return { message: "User deleted successfully." };
  },

  // ── Reset user data ────────────────────────────────────────────────────────
  async resetUserData(adminId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found.");

    await Promise.all([
      prisma.cognitiveProfile.deleteMany({ where: { userId } }),
      prisma.emotionLog.deleteMany({ where: { userId } }),
      prisma.feedback.deleteMany({ where: { userId } }),
      prisma.behaviorEvent.deleteMany({ where: { userId } }),
      prisma.adaptationLog.deleteMany({ where: { userId } }),
    ]);

    await logActivity(adminId, "ADMIN_RESET_USER_DATA", `Reset data for userId=${userId}`);
    return { message: "User data reset successfully." };
  },

  // ── Site Feedback ──────────────────────────────────────────────────────────
  async getAllFeedbacks(filters: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { type, status, limit = 50, offset = 0 } = filters;

    const where: any = {
      ...(type && { type: type as any }),
      ...(status && { status: status as any }),
    };

    const [feedbacks, total] = await Promise.all([
      prisma.siteFeedback.findMany({
        where,
        select: safeFeedbackSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.siteFeedback.count({ where }),
    ]);

    return { feedbacks, total, limit, offset };
  },

  async getFeedbackById(feedbackId: string) {
    const feedback = await prisma.siteFeedback.findUnique({
      where: { id: feedbackId },
      select: safeFeedbackSelect,
    });
    if (!feedback) throw createHttpError(404, "Feedback not found.");
    return feedback;
  },

  async updateFeedbackStatus(
    adminId: string,
    feedbackId: string,
    data: { status: string; adminNote?: string }
  ) {
    const feedback = await prisma.siteFeedback.findUnique({ where: { id: feedbackId } });
    if (!feedback) throw createHttpError(404, "Feedback not found.");

    const updated = await prisma.siteFeedback.update({
      where: { id: feedbackId },
      data: { status: data.status as any, adminNote: data.adminNote },
      select: safeFeedbackSelect,
    });

    await logActivity(adminId, "UPDATE_FEEDBACK_STATUS", `feedbackId=${feedbackId}, status=${data.status}`);
    return updated;
  },

  async deleteFeedback(adminId: string, feedbackId: string) {
    const feedback = await prisma.siteFeedback.findUnique({ where: { id: feedbackId } });
    if (!feedback) throw createHttpError(404, "Feedback not found.");

    await prisma.siteFeedback.delete({ where: { id: feedbackId } });
    await logActivity(adminId, "ADMIN_DELETE_FEEDBACK", `feedbackId=${feedbackId}`);

    return { message: "Feedback deleted successfully." };
  },

  async getFeedbackStats() {
    const [total, byStatus, byType, avgRating] = await Promise.all([
      prisma.siteFeedback.count(),
      prisma.siteFeedback.groupBy({ by: ["status"], _count: true }),
      prisma.siteFeedback.groupBy({ by: ["type"], _count: true }),
      prisma.siteFeedback.aggregate({ _avg: { rating: true } }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
      avgRating: avgRating._avg.rating ?? 0,
    };
  },

  // ── Mail Log Stats ─────────────────────────────────────────────────────────
  async getMailStats(filters: { limit?: number; offset?: number }) {
    const { limit = 50, offset = 0 } = filters;

    const [logs, total, sentCount, failedCount] = await Promise.all([
      prisma.mailLog.findMany({
        orderBy: { sentAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.mailLog.count(),
      prisma.mailLog.count({ where: { status: "SENT" } }),
      prisma.mailLog.count({ where: { status: "FAILED" } }),
    ]);

    return { logs, total, sentCount, failedCount, limit, offset };
  },

  // ── Newsletter Stats ───────────────────────────────────────────────────────
  async getNewsletterStats() {
    const [
      totalSubscribers,
      activeSubscribers,
      unsubscribed,
      totalNewsletters,
      sentNewsletters,
      draftNewsletters,
      recentLogs,
    ] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { isSubscribed: true } }),
      prisma.newsletterSubscriber.count({ where: { isSubscribed: false } }),
      prisma.newsletter.count(),
      prisma.newsletter.count({ where: { status: "SENT" } }),
      prisma.newsletter.count({ where: { status: "DRAFT" } }),
      prisma.newsletterLog.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    return {
      subscribers: {
        total: totalSubscribers,
        active: activeSubscribers,
        unsubscribed,
      },
      newsletters: {
        total: totalNewsletters,
        sent: sentNewsletters,
        draft: draftNewsletters,
      },
      mailLogs: Object.fromEntries(
        recentLogs.map((l) => [l.status, l._count])
      ),
    };
  },

  // ── Teacher-Student Relationships ──────────────────────────────────────────
  async getAllTeacherStudentLinks(filters: {
    limit?: number;
    offset?: number;
  }) {
    const { limit = 50, offset = 0 } = filters;

    const [links, total] = await Promise.all([
      prisma.teacherStudent.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          student: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.teacherStudent.count(),
    ]);

    return { links, total, limit, offset };
  },

  async getStudentsUnderTeacher(teacherId: string) {
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher) throw createHttpError(404, "Teacher not found.");
    if (teacher.role !== userRole.Teacher)
      throw createHttpError(400, "User is not a teacher.");

    return prisma.teacherStudent.findMany({
      where: { teacherId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            createdAt: true,
            studentProfile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  // ── Groups ─────────────────────────────────────────────────────────────────
  async getAllGroups(filters: { limit?: number; offset?: number }) {
    const { limit = 50, offset = 0 } = filters;

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { members: true } },
        },
      }),
      prisma.group.count(),
    ]);

    return { groups, total, limit, offset };
  },

  async getGroupById(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!group) throw createHttpError(404, "Group not found.");
    return group;
  },

  async deleteGroup(adminId: string, groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw createHttpError(404, "Group not found.");
    }

    await prisma.$transaction([
      prisma.groupMember.deleteMany({
        where: {
          groupId,
        },
      }),

      prisma.group.delete({
        where: {
          id: groupId,
        },
      }),
    ]);

    await logActivity(
      adminId,
      "ADMIN_DELETE_GROUP",
      `groupId=${groupId}`
    );

    return {
      message: "Group deleted successfully.",
    };
  },

  // ── Mail Logs ──────────────────────────────────────────────────────────────
  async getMailLogById(mailId: string) {
    const log = await prisma.mailLog.findUnique({ where: { id: mailId } });
    if (!log) throw createHttpError(404, "Mail log not found.");
    return log;
  },

  async getMailLogStats(filters: { from?: string; to?: string }) {
    const { from, to } = filters;

    const where: any = {
      ...((from || to) && {
        sentAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [total, sent, failed, byDate] = await Promise.all([
      prisma.mailLog.count({ where }),
      prisma.mailLog.count({ where: { ...where, status: "SENT" } }),
      prisma.mailLog.count({ where: { ...where, status: "FAILED" } }),
      prisma.mailLog.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      sent,
      failed,
      successRate: total > 0 ? `${Math.round((sent / total) * 100)}%` : "0%",
      byStatus: Object.fromEntries(byDate.map((d) => [d.status, d._count])),
    };
  },

  // ── Broadcast Notification ─────────────────────────────────────────────────
  async broadcastNotification(
    adminId: string,
    title: string,
    message: string,
    targetRole?: string
  ) {
    const where: any = targetRole ? { role: targetRole as any } : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    if (users.length === 0)
      throw createHttpError(404, "No users found to notify.");

    await prisma.notification.createMany({
      data: users.map((u) => ({
        title,
        message,
        type: "INFO",
        teacherId: null,
        studentId: u.id,
      })),
    });

    await logActivity(
      adminId,
      "ADMIN_BROADCAST_NOTIFICATION",
      `Sent to ${users.length} users${targetRole ? ` (role: ${targetRole})` : ""}`
    );

    return {
      message: `Notification broadcast to ${users.length} users.`,
      count: users.length,
    };
  },

  // ── Cognitive Analytics ────────────────────────────────────────────────────
  async getCognitiveAnalytics() {
    const [profiles, avgStats, topFocused] = await Promise.all([
      prisma.cognitiveProfile.count(),
      prisma.cognitiveProfile.aggregate({
        _avg: {
          attentionScore: true,
          focusDuration: true,
          interactions: true,
        },
        _max: { attentionScore: true },
        _min: { attentionScore: true },
      }),
      prisma.cognitiveProfile.findMany({
        orderBy: { attentionScore: "desc" },
        take: 5,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    return {
      totalProfiles: profiles,
      averages: {
        attentionScore: avgStats._avg.attentionScore ?? 0,
        focusDuration: avgStats._avg.focusDuration ?? 0,
        interactions: avgStats._avg.interactions ?? 0,
      },
      range: {
        maxAttentionScore: avgStats._max.attentionScore ?? 0,
        minAttentionScore: avgStats._min.attentionScore ?? 0,
      },
      topFocusedStudents: topFocused,
    };
  },

  // ── Emotion Analytics ──────────────────────────────────────────────────────
  async getEmotionAnalytics(filters: { from?: string; to?: string }) {
    const { from, to } = filters;

    const where: any = {
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [distribution, avgIntensity, timeline] = await Promise.all([
      prisma.emotionLog.groupBy({
        by: ["emotion"],
        where,
        _count: { emotion: true },
        _avg: { intensity: true },
        orderBy: { _count: { emotion: "desc" } },
      }),
      prisma.emotionLog.aggregate({
        where,
        _avg: { intensity: true },
      }),
      prisma.emotionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          emotion: true,
          intensity: true,
          createdAt: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      distribution: distribution.map((e) => ({
        emotion: e.emotion,
        count: e._count.emotion,
        avgIntensity: e._avg.intensity ?? 0,
      })),
      overallAvgIntensity: avgIntensity._avg.intensity ?? 0,
      recentTimeline: timeline,
    };
  },

  // ── Behavior Analytics ─────────────────────────────────────────────────────
  async getBehaviorAnalytics(filters: { from?: string; to?: string }) {
    const { from, to } = filters;

    const where: any = {
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [breakdown, topUsers, recentEvents] = await Promise.all([
      prisma.behaviorEvent.groupBy({
        by: ["type"],
        where,
        _count: { type: true },
        orderBy: { _count: { type: "desc" } },
      }),
      prisma.behaviorEvent.groupBy({
        by: ["userId"],
        where,
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 5,
      }),
      prisma.behaviorEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      breakdown: breakdown.map((b) => ({
        type: b.type,
        count: b._count.type,
      })),
      topActiveUsers: topUsers.map((u) => ({
        userId: u.userId,
        eventCount: u._count.userId,
      })),
      recentEvents,
    };
  },

  // ── Teacher Verification ───────────────────────────────────────────────────
  async getAllVerificationRequests(filters: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, limit = 50, offset = 0 } = filters;

    const where: any = status
      ? { status: status as any }
      : {};

    const [requests, total] = await Promise.all([
      prisma.teacherVerificationRequest.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              teacherProfile: true,
            },
          },
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.teacherVerificationRequest.count({ where }),
    ]);

    return { requests, total, limit, offset };
  },

  async reviewVerificationRequest(
    adminId: string,
    teacherId: string,
    decision: "APPROVED" | "REJECTED",
    adminNote?: string
  ) {
    const request = await prisma.teacherVerificationRequest.findUnique({
      where: { teacherId },
    });

    if (!request)
      throw createHttpError(404, "Verification request not found.");
    if (request.status !== "PENDING")
      throw createHttpError(400, "This request has already been reviewed.");

    // ── Fetch teacher details for mail ──
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { firstName: true, lastName: true, email: true },
    });

    if (!teacher)
      throw createHttpError(404, "Teacher not found.");

    // ── Update verification request ──
    const updated = await prisma.teacherVerificationRequest.update({
      where: { teacherId },
      data: {
        status: decision,
        adminNote: adminNote ?? null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // ── Update teacher profile ──
    await prisma.teacherProfile.update({
      where: { userId: teacherId },
      data: {
        isVerified: decision === "APPROVED",
        isPublished: decision === "APPROVED",
      },
    });

    // ── Send confirmation mail ──
    if (decision === "APPROVED") {
      await sendNewsletterMail({
        to: teacher.email,
        subject: "🎉 Your NeuroViz Teacher Profile Has Been Approved!",
        html: `
        <h2>Congratulations, ${teacher.firstName}!</h2>
        <p>We're excited to let you know that your teacher profile on <strong>NeuroViz</strong> has been <strong style="color: green;">approved and published</strong>.</p>
        <p>You can now access all teacher features including:</p>
        <ul>
          <li>Managing students and groups</li>
          <li>Creating and evaluating assignments</li>
          <li>Reviewing mindmaps</li>
          <li>Accessing dashboard analytics</li>
        </ul>
        <p>Log in to your dashboard to get started.</p>
        <br/>
        ${adminNote ? `<p><strong>Admin Note:</strong> ${adminNote}</p>` : ""}
        <p>Welcome aboard, ${teacher.firstName}! 🚀</p>
        <p><i>The NeuroViz Team</i></p>
      `,
        sentBy: adminId,
      });
    } else {
      await sendNewsletterMail({
        to: teacher.email,
        subject: "Update on Your NeuroViz Teacher Profile Verification",
        html: `
        <h2>Hi ${teacher.firstName},</h2>
        <p>Thank you for submitting your teacher profile for verification on <strong>NeuroViz</strong>.</p>
        <p>After careful review, we were unable to approve your profile at this time.</p>
        ${adminNote
            ? `<p><strong>Reason:</strong> ${adminNote}</p>`
            : "<p>Please ensure your profile is complete and your certifications are valid.</p>"
          }
        <br/>
        <p>You are welcome to update your profile and certifications and resubmit for review.</p>
        <p>If you have any questions, please contact our support team.</p>
        <br/>
        <p><i>The NeuroViz Team</i></p>
      `,
        sentBy: adminId,
      });
    }

    await logActivity(
      adminId,
      `TEACHER_VERIFICATION_${decision}`,
      `teacherId=${teacherId}, adminNote=${adminNote ?? "none"}`
    );

    return {
      message: `Teacher profile ${decision.toLowerCase()} successfully.`,
      request: updated,
    };
  },
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}