import prisma from "../../config/database";

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
