import prisma from "../../config/database";

export const runAdaptationForUser = async (userId: string) => {
  await prisma.activityLog.create({
    data: {
      userId,
      action: "ADAPTATION_RUN_STARTED",
      details: `System started adaptation analysis for user ${userId}`,
    },
  });

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
   
    const counts = emotions.reduce((acc: Record<string, number>, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {});

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

    // Log: preferences updated
    await prisma.activityLog.create({
      data: {
        userId,
        action: "USER_PREFERENCES_UPDATED",
        details: `Updated preferences with: ${JSON.stringify(changes)}`,
      },
    });

    await prisma.adaptationLog.create({
      data: { userId, changes, reason },
    });

    // Log: adaptation entry added
    await prisma.activityLog.create({
      data: {
        userId,
        action: "ADAPTATION_LOGGED",
        details: `Adaptation log created. Reason: ${reason}`,
      },
    });

    // Adaptation applied
    await prisma.activityLog.create({
      data: {
        userId,
        action: "ADAPTATION_APPLIED",
        details: `Adaptation applied with changes ${JSON.stringify(changes)}`,
      },
    });

    return { applied: true, changes, reason };
  }

  // No adaptation needed
  await prisma.activityLog.create({
    data: {
      userId,
      action: "ADAPTATION_SKIPPED",
      details: `No changes applied for user ${userId} (no adaptation needed)`,
    },
  });

  return { applied: false, changes: {}, reason: "" };
};
