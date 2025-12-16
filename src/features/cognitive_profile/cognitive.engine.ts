import { BehaviorType } from "@prisma/client";

export interface CognitiveDelta {
  attentionScore?: number;
  focusDuration?: number;
  interactions?: number;
}

export function deriveCognitiveDelta(
  action: BehaviorType,
  metadata?: any
): CognitiveDelta {
  switch (action) {
    case "PAGE_FOCUS":
      return {
        attentionScore: metadata?.quality ?? 0.3,
        focusDuration: metadata?.durationSec ?? 5,
        interactions: 1,
      };

    case "CLICK":
      return {
        attentionScore: 0.1,
        interactions: 1,
      };

    case "IDLE":
      return {
        attentionScore: -0.4,
      };

    default:
      return {};
  }
}
