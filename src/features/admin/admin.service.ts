import prisma from "../../config/database";

export const getSystemOverview = async () => {
  const userCount = await prisma.user.count();
  const mapCount = await prisma.mindmap.count();
  const avgAttention = await prisma.cognitiveProfile.aggregate({
    _avg: { attentionScore: true },
  });
  const emotionCounts = await prisma.emotionLog.groupBy({
    by: ["emotion"],
    _count: { emotion: true },
  });

  return {
    userCount,
    mapCount,
    avgAttention: avgAttention._avg.attentionScore ?? null,
    emotionCounts,
  };
};
