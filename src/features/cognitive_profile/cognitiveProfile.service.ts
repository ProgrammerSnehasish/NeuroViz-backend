import prisma from "../../config/database";

interface CognitivePayload {
  attentionScore?: number;
  focusDuration?: number;
  interactions?: number;
}

export const upsertCognitiveProfile = async (userId: string, payload: CognitivePayload) => {
  const existing = await prisma.cognitiveProfile.findUnique({ where: { userId } });

  if (existing) {
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_COGNITIVE_PROFILE",
        details: `Updated cognitive profile for user ${userId}`,
      },
    });
    return await prisma.cognitiveProfile.update({
      where: { userId },
      data: payload,
    });
  }

  await prisma.activityLog.create({
    data: {
      userId,
      action: "CREATE_COGNITIVE_PROFILE",
      details: `Created cognitive profile for user ${userId}`,
    },
  });

  return await prisma.cognitiveProfile.create({
    data: { userId, ...payload },
  });
};

export const getCognitiveProfile = async (userId: string) => {
  if (!userId) throw new Error("userId is required");
  await prisma.activityLog.create({
    data: {
      userId,
      action: "FETCH_COGNITIVE_PROFILE",
      details: `Fetched cognitive profile for user ${userId}`,
    },
  });
  return await prisma.cognitiveProfile.findUnique({ where: { userId } });
};
