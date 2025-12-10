import prisma from "../config/database";

export const ActivityLogService = {
  async log(userId: string, action: string, details?: string) {
    try {
      await prisma.activityLog.create({
        data: { userId, action, details },
      });
    } catch (err) {
      console.error("Failed to write activity log:", err);
    }
  }
};

