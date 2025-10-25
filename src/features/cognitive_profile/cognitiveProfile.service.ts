import prisma from "../../config/database";

interface CognitivePayload {
  attentionScore?: number;
  focusDuration?: number;
  interactions?: number;
}

export const upsertCognitiveProfile = async (userId: string, payload: CognitivePayload) => {
  const existing = await prisma.cognitiveProfile.findUnique({ where: { userId } });

  if (existing) {
    return await prisma.cognitiveProfile.update({
      where: { userId },
      data: payload,
    });
  }

  return await prisma.cognitiveProfile.create({
    data: { userId, ...payload },
  });
};

export const getCognitiveProfile = async (userId: string) => {
  return await prisma.cognitiveProfile.findUnique({ where: { userId } });
};
