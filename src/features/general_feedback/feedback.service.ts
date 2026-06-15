import createHttpError from "http-errors";
import { SubmitFeedbackDto, UpdateFeedbackStatusDto } from "./feedback.dto";
import prisma from "../../config/database";
import { sendMail } from "../../utils/mailer";

type SubmitFeedbackInput = InstanceType<typeof SubmitFeedbackDto>;
type UpdateFeedbackStatusInput = InstanceType<typeof UpdateFeedbackStatusDto>;

// ─────────────────────────────────────────────────────────────────────────────

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
// ─────────────────────────────────────────────────────────────────────────────

export const FeedbackService = {

  // ── USER: Submit feedback ──────────────────────────────────────────────────
  async submitFeedback(data: SubmitFeedbackInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) throw createHttpError(404, "No account found with this email.");

    const feedback = await prisma.siteFeedback.create({
      data: {
        userId: user.id,
        type: data.type,
        title: data.title,
        message: data.message,
        rating: data.rating,
      },
      select: safeFeedbackSelect,
    });

    await sendMail({
      to: user.email,
      subject: "We received your feedback — NeuroViz",
      html: `
    <h2>Hi ${user.firstName},</h2>
    <p>Thank you for taking the time to share your feedback with us.</p>
    <p><strong>Type:</strong> ${data.type}</p>
    <p><strong>Title:</strong> ${data.title}</p>
    <p><strong>Message:</strong> ${data.message}</p>
    ${data.rating ? `<p><strong>Rating:</strong> ${data.rating}/5</p>` : ""}
    <br/>
    <p>Our team will review your feedback and get back to you if needed.</p>
    <p>Thank you for helping us improve NeuroViz!</p>
    <i>If you did not submit this feedback, please ignore this email.</i>
  `,
      teacherId: user.id,   // user themselves as sender since no teacher is involved
      studentId: null,
    });

    await logActivity(user.id, "SUBMIT_FEEDBACK", `feedbackId=${feedback.id}`);
    return feedback;
  },

  // ── USER: Get own feedbacks ────────────────────────────────────────────────
  async getMyFeedbacks(userId: string) {
    return prisma.siteFeedback.findMany({
      where: { userId },
      select: safeFeedbackSelect,
      orderBy: { createdAt: "desc" },
    });
  },

  // ── USER: Get single own feedback ──────────────────────────────────────────
  async getMyFeedbackById(userId: string, feedbackId: string) {
    const feedback = await prisma.siteFeedback.findUnique({
      where: { id: feedbackId },
      select: safeFeedbackSelect,
    });

    if (!feedback) throw createHttpError(404, "Feedback not found.");
    if (feedback.user.id !== userId)
      throw createHttpError(403, "You are not allowed to view this feedback.");

    return feedback;
  },

  // ── USER: Delete own feedback (only if still PENDING) ─────────────────────
  async deleteMyFeedback(userId: string, feedbackId: string) {
    const feedback = await prisma.siteFeedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) throw createHttpError(404, "Feedback not found.");
    if (feedback.userId !== userId)
      throw createHttpError(403, "You are not allowed to delete this feedback.");
    if (feedback.status !== "PENDING")
      throw createHttpError(400, "Only pending feedbacks can be deleted.");

    await prisma.siteFeedback.delete({ where: { id: feedbackId } });
    await logActivity(userId, "DELETE_FEEDBACK", `feedbackId=${feedbackId}`);

    return { message: "Feedback deleted successfully." };
  },

  // ── ADMIN: Get all feedbacks ───────────────────────────────────────────────
  async getAllFeedbacks(filters: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { type, status, limit = 50, offset = 0 } = filters;

    const [feedbacks, total] = await Promise.all([
      prisma.siteFeedback.findMany({
        where: {
          ...(type && { type: type as any }),
          ...(status && { status: status as any }),
        },
        select: safeFeedbackSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.siteFeedback.count({
        where: {
          ...(type && { type: type as any }),
          ...(status && { status: status as any }),
        },
      }),
    ]);

    return { feedbacks, total, limit, offset };
  },

  // ── ADMIN: Get single feedback ─────────────────────────────────────────────
  async getFeedbackById(feedbackId: string) {
    const feedback = await prisma.siteFeedback.findUnique({
      where: { id: feedbackId },
      select: safeFeedbackSelect,
    });

    if (!feedback) throw createHttpError(404, "Feedback not found.");
    return feedback;
  },

  // ── ADMIN: Update feedback status ──────────────────────────────────────────
  async updateFeedbackStatus(
    adminId: string,
    feedbackId: string,
    data: UpdateFeedbackStatusInput
  ) {
    const feedback = await prisma.siteFeedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) throw createHttpError(404, "Feedback not found.");

    const updated = await prisma.siteFeedback.update({
      where: { id: feedbackId },
      data: {
        status: data.status,
        adminNote: data.adminNote,
      },
      select: safeFeedbackSelect,
    });

    await logActivity(adminId, "UPDATE_FEEDBACK_STATUS", `feedbackId=${feedbackId}, status=${data.status}`);
    return updated;
  },

  // ── ADMIN: Delete any feedback ─────────────────────────────────────────────
  async deleteFeedback(adminId: string, feedbackId: string) {
    const feedback = await prisma.siteFeedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) throw createHttpError(404, "Feedback not found.");

    await prisma.siteFeedback.delete({ where: { id: feedbackId } });
    await logActivity(adminId, "ADMIN_DELETE_FEEDBACK", `feedbackId=${feedbackId}`);

    return { message: "Feedback deleted successfully." };
  },

  // ── ADMIN: Stats overview ──────────────────────────────────────────────────
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
};