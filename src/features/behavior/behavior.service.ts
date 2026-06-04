import { BehaviorType } from "@prisma/client";
import prisma from "../../config/database";
import { deriveCognitiveDelta } from "../cognitive_profile/cognitive.engine";
import { runAdaptationForUser } from "../adapt/adapt.service";
// import { applyCognitiveDelta } from "../cognitiveProfile.service";

export const recordBehavior = async (
  userId: string,
  type: BehaviorType,
  metadata?: any
) => {
  const event = await prisma.$transaction(async (tx) => {
    // store behavioral event
    const event = await tx.behaviorEvent.create({
      data: {
        userId,
        type,
        metadata,
      },
    });

    // derive cognitive delta
    const delta = deriveCognitiveDelta(type, metadata);

    const clamp = (val: number, min: number, max: number) =>
      Math.min(max, Math.max(min, val));

    const safeDelta = {
      ...delta,
      attentionScore:
        delta.attentionScore !== undefined
          ? clamp(delta.attentionScore, -1, 1)
          : undefined,
    };

    // apply cognitive update (use SAME transaction)
    await tx.cognitiveProfile.upsert({
      where: { userId },
      create: {
        userId,
        attentionScore: safeDelta.attentionScore ?? 0,
        focusDuration: safeDelta.focusDuration ?? 0,
        interactions: safeDelta.interactions ?? 0,
      },
      update: {
        ...(safeDelta.attentionScore !== undefined && {
          attentionScore: { increment: safeDelta.attentionScore },
        }),

        ...(safeDelta.focusDuration !== undefined &&
          safeDelta.focusDuration > 0 && {
            focusDuration: { increment: safeDelta.focusDuration },
          }),

        ...(safeDelta.interactions !== undefined &&
          safeDelta.interactions > 0 && {
            interactions: { increment: safeDelta.interactions },
          }),
      },
    });

    return event;
  });

  runAdaptationForUser(userId).catch((err) => {
    console.error("Adaptation run failed for user:", userId, err);
  });

  return event;
};