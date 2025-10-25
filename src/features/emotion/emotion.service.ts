import prisma from "../../config/database";

export const logEmotion = async (userId: string, data: any) => {
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
  return await prisma.emotionLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
};
