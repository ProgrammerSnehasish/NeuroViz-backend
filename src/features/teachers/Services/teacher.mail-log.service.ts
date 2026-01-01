import { userRole } from "../../../config/core";
import prisma from "../../../config/database";
import createHttpError from "http-errors";

async function logActivity(userId: string, action: string, details?: string) {
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

export const MailLogService = {
  /**
   * Validate teacher identity
   */
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== userRole.Teacher) {
    throw createHttpError(403, "Only teachers can view mail logs.");
  }
    return user;
},

  /**
   * Get all mail logs *related* to a teacher
   */
  async getTeacherMailLogs(teacherId: string, limit = 50) {
    await this.validateTeacher(teacherId);

    await logActivity(teacherId, "VIEW_MAIL_LOGS", `limit=${limit}`);

    return prisma.mailLog.findMany({
      where: {
        OR: [
          { senderId: teacherId },    // teacher sent mail
          { recipientId: teacherId }, // teacher received mail
        ],
      },
      orderBy: { sentAt: "desc" },
      take: limit,
    });
  },

    /**
     * Get a single mail log by ID (must belong to teacher)
     */
    async getMailLogById(teacherId: string, mailId: string) {
  await this.validateTeacher(teacherId);

  const mail = await prisma.mailLog.findUnique({ where: { id: mailId } });

  if (!mail) throw createHttpError(404, "Mail not found.");

  // Strict ownership enforcement
  if (
    mail.senderId !== teacherId &&
    mail.recipientId !== teacherId
  ) {
    throw createHttpError(403, "Unauthorized access to this mail log.");
  }

  await logActivity(teacherId, "VIEW_MAIL_LOG_DETAIL", `mailId=${mailId}`);

  return mail;
},
};
