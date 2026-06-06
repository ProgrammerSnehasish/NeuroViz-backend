import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsIn,
  IsNumber,
  IsUUID,
  Min,
  Max,
  IsBoolean,
  Matches,
} from "class-validator";
import { Type, Transform } from "class-transformer";

// ─── Constants ───────────────────────────────────────────────────────────────

/** All voices supported by the TTS provider. */
export const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];

/** Regex that matches standard and shortened YouTube URLs. */
const YOUTUBE_URL_REGEX =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/;

// ─── Shared decorators (applied via mixin-style base classes) ─────────────────

/**
 * Base for all DTOs that identify a user and a resource.
 * Centralises the userId + mindmapId pair used by most neurodivergent endpoints.
 */
class UserMindmapBase {
  @IsUUID("4", { message: "mindmapId must be a valid UUID v4." })
  @IsString()
  @IsNotEmpty()
  mindmapId!: string;
}

// ─── Input → Mindmap DTOs ─────────────────────────────────────────────────────

/** Shared base for upload-based mindmap creation (audio / document / video). */

export class YouTubeMindmapDto {

  @IsUrl({}, { message: "youtubeUrl must be a valid URL." })
  @Matches(YOUTUBE_URL_REGEX, {
    message: "youtubeUrl must be a valid YouTube URL (youtube.com or youtu.be).",
  })
  youtubeUrl!: string;
}

// ─── TTS DTOs ─────────────────────────────────────────────────────────────────

/** Shared TTS voice + speed options. */
class TtsOptionsBase {
  @IsOptional()
  @IsIn(TTS_VOICES, { message: `voice must be one of: ${TTS_VOICES.join(", ")}.` })
  voice?: TtsVoice;

  @IsOptional()
  @IsNumber({}, { message: "speed must be a number." })
  @Min(0.25)
  @Max(4.0)
  @Type(() => Number)
  speed?: number;
}

export class TextToAudioDto extends TtsOptionsBase {
  @IsString()
  @IsNotEmpty()
  text!: string;
}

export class MindmapToAudioDto extends UserMindmapBase {
  // UserMindmapBase provides userId + mindmapId
  @IsOptional()
  @IsIn(TTS_VOICES, { message: `voice must be one of: ${TTS_VOICES.join(", ")}.` })
  voice?: TtsVoice;

  @IsOptional()
  @IsNumber({}, { message: "speed must be a number." })
  @Min(0.25)
  @Max(4.0)
  @Type(() => Number)
  speed?: number;
}

// ─── Neurodivergent DTOs ──────────────────────────────────────────────────────

export class ChunkedNodeDto extends UserMindmapBase {
  @IsNumber({}, { message: "nodeIndex must be a number." })
  @Min(0)
  @Type(() => Number)
  nodeIndex!: number;
}

export class GenerateQuizDto extends UserMindmapBase {}

export class StudyPlanDto extends UserMindmapBase {
  /**
   * Number of mindmap nodes per Pomodoro block.
   * Defaults to 2 if omitted (enforced in the router/service layer).
   */
  @IsOptional()
  @IsNumber({}, { message: "nodesPerBlock must be a number." })
  @Min(1)
  @Max(5)
  @Type(() => Number)
  nodesPerBlock?: number;
}

export class SimplifyMindmapDto extends UserMindmapBase {
  /**
   * Whether to prepend an emoji to each node label.
   * Query params arrive as strings — @Transform coerces "true"/"false" before @IsBoolean validates.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true")  return true;
    if (value === "false") return false;
    return value; // leave as-is so @IsBoolean can reject it with a clear message
  })
  @IsBoolean({ message: 'addEmojis must be "true" or "false".' })
  addEmojis?: boolean;

  @IsOptional()
  @IsNumber({}, { message: "maxWordsPerChild must be a number." })
  @Min(5)
  @Max(30)
  @Type(() => Number)
  maxWordsPerChild?: number;
}