import prisma from "../../config/database";
import { runAdaptationForUser } from "../adapt/adapt.service";

export const createFeedback = async (userId: string, data: any) => {
  const feedback = await prisma.feedback.create({
    data: {
      userId,
      mapId: data.mapId ?? null,
      rating: data.rating ?? null,
      comments: data.comments ?? null,
      timeSpent: data.timeSpent ?? null,
    },
  });

  // Auto-trigger adaptation logic
  runAdaptationForUser(userId)
    .then((r) => console.log("Adaptation triggered after feedback:", r))
    .catch(console.error);

  await prisma.activityLog.create({
    data: {
      userId,
      action: "FEEDBACK_CREATED",
      details: `Created feedback with ID ${feedback.id}`,
    },
  });
  return feedback;
};

export const getFeedbackByUser = async (userId: string) => {
  await prisma.activityLog.create({
    data: {
      userId,
      action: "FETCH_FEEDBACK",
      details: `Fetched feedback entries for user ${userId}`,
    },
  });
  return await prisma.feedback.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};
