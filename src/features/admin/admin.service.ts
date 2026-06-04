import { userRole } from "../../config/core";
import prisma from "../../config/database";
import createHttpError from "http-errors";

export const AdminService = {

  // Verify admin
  async validateAdmin(userId: string) {
    const admin = await prisma.user.findUnique({ where: { id: userId } });
    if (!admin || admin.role !== userRole.Admin)
      throw createHttpError(403, "Access denied. Admin only.");
    await prisma.activityLog.create({
      data: {
        userId,
        action: "ADMIN_VALIDATION",
        details: `Admin ${userId} authenticated.`,
      },
    });
    return admin;
  },

  // Dashboard Overview
  async getSystemOverview() {
    const [userCount, mapCount, cognitiveAvg, emotionCounts] = await Promise.all([
      prisma.user.count(),
      prisma.mindmap.count(),
      prisma.cognitiveProfile.aggregate({
        _avg: { attentionScore: true }
      }),
      prisma.emotionLog.groupBy({
        by: ["emotion"],
        _count: { emotion: true }
      })
    ]);

    return {
      userCount,
      mapCount,
      avgAttention: cognitiveAvg._avg.attentionScore || 0,
      emotionCounts
    };
  },

  // System Health
  async getSystemHealth() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [logins, mindmaps, submissions] = await Promise.all([
      prisma.activityLog.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.mindmap.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.assignmentSubmission.count({ where: { createdAt: { gte: last24Hours } } })
    ]);

    return {
      uptime: process.uptime(),
      activeToday: logins,
      newMindmapsToday: mindmaps,
      submissionsToday: submissions
    };
  },

  // Activity Logs
  async getActivityLogs(limit: number = 50) {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    });
  },

  // All users
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
  },

  // Activate/Deactivate User
  async updateUserStatus(userId: string, isActive: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });
  },

  // Delete User
  async deleteUser(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
    return { message: "User deleted successfully." };
  },

  // Reset User Cognitive/Emotion Data
  async resetUserData(userId: string) {
    await prisma.cognitiveProfile.deleteMany({ where: { userId } });
    await prisma.emotionLog.deleteMany({ where: { userId } });
    await prisma.feedback.deleteMany({ where: { userId } });

    return { message: "User data reset successfully." };
  }
};
