import prisma from "../../../config/database";
import createHttpError from "http-errors";

export const MailLogService = {
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "TEACHER") {
      throw createHttpError(403, "Only teachers can view mail logs.");
    }
    return user;
  },

  async getTeacherMailLogs(teacherId: string, limit = 50) {
    await this.validateTeacher(teacherId);

    // Retrieve recent mails related to the teacher
    return prisma.mailLog.findMany({
      where: {
        OR: [
          { body: { contains: teacherId } }, // if mail body references teacher
          { subject: { contains: "NeuroViz" } }, // optional filter
        ],
      },
      orderBy: { sentAt: "desc" },
      take: limit,
    });
  },

  async getMailLogById(teacherId: string, mailId: string) {
    await this.validateTeacher(teacherId);

    const mail = await prisma.mailLog.findUnique({ where: { id: mailId } });
    if (!mail) throw createHttpError(404, "Mail not found.");

    return mail;
  },
};
