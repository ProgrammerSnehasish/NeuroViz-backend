import { userRole } from "../../../config/core";
import prisma from "../../../config/database";
import createHttpError from "http-errors";

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

export const MailLogService = {
  // ─── Validate teacher ───────────────────────────────────────────────────
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== userRole.Teacher)
      throw createHttpError(403, "Only teachers can view mail logs.");
    return user;
  },

  // ─── GET ALL MAIL LOGS FOR TEACHER ──────────────────────────────────────
  /**
   * Returns sent + received mail logs for a teacher, newest first.
   * Also returns summary counts (sent, received, total).
   */
  async getTeacherMailLogs(teacherId: string, limit = 50) {
    await this.validateTeacher(teacherId);

    const mails = await prisma.mailLog.findMany({
      where: {
        OR: [
          { senderId: teacherId },
          { recipientId: teacherId },
        ],
      },
      orderBy: { sentAt: "desc" },
      take: limit,
    });

    const sentCount     = mails.filter((m) => m.senderId     === teacherId).length;
    const receivedCount = mails.filter((m) => m.recipientId  === teacherId).length;

    await logActivity(teacherId, "VIEW_MAIL_LOGS", `limit=${limit}`);

    return {
      total: mails.length,
      sent: sentCount,
      received: receivedCount,
      mails,
    };
  },

  // ─── GET SINGLE MAIL LOG ─────────────────────────────────────────────────
  async getMailLogById(teacherId: string, mailId: string) {
    await this.validateTeacher(teacherId);

    const mail = await prisma.mailLog.findUnique({ where: { id: mailId } });
    if (!mail) throw createHttpError(404, "Mail not found.");

    if (mail.senderId !== teacherId && mail.recipientId !== teacherId)
      throw createHttpError(403, "Unauthorized access to this mail log.");

    await logActivity(teacherId, "VIEW_MAIL_LOG_DETAIL", `mailId=${mailId}`);
    return mail;
  },
};