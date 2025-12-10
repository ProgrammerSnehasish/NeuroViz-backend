import prisma from "../../config/database";

export const logEmotion = async (userId: string, data: any) => {
  await prisma.activityLog.create({
    data: {
      userId,
      action: "EMOTION_LOGGED",
      details: `Logged emotion: ${data.emotion}`,
    },
  });
  return await prisma.emotionLog.create({
    data: {
      userId,
      emotion: data.emotion,
      intensity: data.intensity ?? null,
      meta: data.meta ?? null,
    },
  });
};

export const getEmotionLogs = async (userId: string) => {
  await prisma.activityLog.create({
    data: {
      userId,
      action: "FETCH_EMOTION_LOGS",
      details: `Fetched emotion logs for user ${userId}`,
    },
  });
  return await prisma.emotionLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
};
