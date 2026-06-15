import createHttpError from "http-errors";
import prisma from "../../../config/database";

type GiveMindmapFeedbackInput = {
  mapId: string;
  rating?: number;
  comments?: string;
  timeSpent?: number;
};

type UpdateMindmapFeedbackInput = {
  rating?: number;
  comments?: string;
  timeSpent?: number;
};

const safeFeedbackSelect = {
  id: true,
  mapId: true,
  rating: true,
  comments: true,
  timeSpent: true,
  createdAt: true,
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

export const MindmapFeedbackService = {

  // ── Give feedback on a mindmap ─────────────────────────────────────────────
  async giveFeedback(userId: string, data: GiveMindmapFeedbackInput) {
    const mindmap = await prisma.mindmap.findUnique({
      where: { id: data.mapId },
    });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");

    const existing = await prisma.feedback.findFirst({
      where: { userId, mapId: data.mapId },
    });
    if (existing) {
      throw createHttpError(409, "You have already given feedback on this mindmap.");
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        mapId: data.mapId,
        rating: data.rating,
        comments: data.comments,
        timeSpent: data.timeSpent,
      },
      select: safeFeedbackSelect,
    });

    await logActivity(userId, "GIVE_MINDMAP_FEEDBACK", `mapId=${data.mapId}, feedbackId=${feedback.id}`);
    return feedback;
  },

  // ── Get all feedbacks for a mindmap ───────────────────────────────────────
  async getFeedbacksForMindmap(mapId: string) {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");

    return prisma.feedback.findMany({
      where: { mapId },
      select: safeFeedbackSelect,
      orderBy: { createdAt: "desc" },
    });
  },

  // ── Get own feedback for a specific mindmap ────────────────────────────────
  async getMyFeedbackForMindmap(userId: string, mapId: string) {
    const feedback = await prisma.feedback.findFirst({
      where: { userId, mapId },
      select: safeFeedbackSelect,
    });

    if (!feedback) throw createHttpError(404, "No feedback found for this mindmap.");
    return feedback;
  },

  // ── Get all feedbacks submitted by the user ────────────────────────────────
  async getMyFeedbacks(userId: string) {
    return prisma.feedback.findMany({
      where: { userId },
      select: safeFeedbackSelect,
      orderBy: { createdAt: "desc" },
    });
  },

  // ── Update own feedback ────────────────────────────────────────────────────
  async updateFeedback(userId: string, feedbackId: string, data: UpdateMindmapFeedbackInput) {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) throw createHttpError(404, "Feedback not found.");
    if (feedback.userId !== userId)
      throw createHttpError(403, "You are not allowed to update this feedback.");

    const updated = await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.comments !== undefined && { comments: data.comments }),
        ...(data.timeSpent !== undefined && { timeSpent: data.timeSpent }),
      },
      select: safeFeedbackSelect,
    });

    await logActivity(userId, "UPDATE_MINDMAP_FEEDBACK", `feedbackId=${feedbackId}`);
    return updated;
  },

  // ── Delete own feedback ────────────────────────────────────────────────────
  async deleteFeedback(userId: string, feedbackId: string) {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) throw createHttpError(404, "Feedback not found.");
    if (feedback.userId !== userId)
      throw createHttpError(403, "You are not allowed to delete this feedback.");

    await prisma.feedback.delete({ where: { id: feedbackId } });
    await logActivity(userId, "DELETE_MINDMAP_FEEDBACK", `feedbackId=${feedbackId}`);

    return { message: "Feedback deleted successfully." };
  },
};