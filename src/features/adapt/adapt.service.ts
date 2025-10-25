import prisma from "../../config/database";

export const runAdaptationForUser = async (userId: string) => {
  const [profile, emotions, feedbacks] = await Promise.all([
    prisma.cognitiveProfile.findUnique({ where: { userId } }),
    prisma.emotionLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const changes: Record<string, any> = {};
  let reason = "";

  // ───────────────────────────────
  // Emotion-based adaptation logic
  // ───────────────────────────────
  if (emotions.length > 0) {
    // Properly type the accumulator
    const counts = emotions.reduce((acc: Record<string, number>, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {});

    // Type entries as [string, number][]
    const entries = Object.entries(counts) as [string, number][];
    const dominant = entries.sort((a, b) => b[1] - a[1])[0][0];

    if (dominant === "fatigued") {
      changes.colorMode = "calm";
      reason += "Fatigued patterns detected. ";
    }
  }

  // ───────────────────────────────
  // Cognitive-based adaptation logic
  // ───────────────────────────────
  if (profile?.attentionScore !== undefined && profile?.attentionScore !== null && profile.attentionScore < 0.4) {
    changes.complexity = "low";
    reason += "Low attention detected. ";
  }

  // ───────────────────────────────
  // Feedback-based adaptation logic
  // ───────────────────────────────
  if (feedbacks.length > 0) {
    const avg =
      feedbacks.reduce((sum, f) => sum + (f.rating ?? 0), 0) / feedbacks.length;

    if (avg < 3) {
      changes.voiceRate = 0.95;
      reason += "Low feedback ratings. ";
    }
  }

  // ───────────────────────────────
  // Save user preference changes
  // ───────────────────────────────
  if (Object.keys(changes).length > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prefs = { ...(user?.preferences as any), ...changes };

    await prisma.user.update({
      where: { id: userId },
      data: { preferences: prefs },
    });

    await prisma.adaptationLog.create({
      data: { userId, changes, reason },
    });
  }

  return { applied: Object.keys(changes).length > 0, changes, reason };
};
