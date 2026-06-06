import createHttpError from "http-errors";
import { audioToMindmap } from "./mindmap.audio.service";
import { documentToMindmap } from "./mindmap.document.service";
import { videoFileToMindmap, youtubeToMindmap } from "./mindmap.video.service";
import { textToAudio as ttsTextToAudio, mindmapToNarration } from "./mindmap.tts.service";
import {
  getChunkedNode as chunkedNodeHelper,
  simplifyMindmap,
  addEmojiAnchors,
  simplifyChildLabels,
  generateQuiz as quizHelper,
  assignColours,
  generateStudyPlan as studyPlanHelper,
  generateAnalogyPrompts,
  MindmapStructure,
} from "./mindmap.neurodivergent.service";

import {
  YouTubeMindmapDto,
  TextToAudioDto,
  MindmapToAudioDto,
  ChunkedNodeDto,
  GenerateQuizDto,
  StudyPlanDto,
  SimplifyMindmapDto,
  TtsVoice,
} from "../dto/mindmap.extended.dto";
import prisma from "../../../config/database";
import path from "path";

export class MindmapExtendedService {

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Logs an activity without blocking the caller.
   * A failed log write should never surface as a 500 to the user.
   */
  private logActivity(userId: string, action: string, details: string): void {
    prisma.activityLog
      .create({ data: { userId, action, details } })
      .catch((err) =>
        console.error(`[ActivityLog] Failed to write "${action}" for user ${userId}:`, err)
      );
  }

  private async loadOwnedMindmap(mindmapId: string, tokenUserId: string) {
    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found.");
    if (mindmap.userId !== tokenUserId) throw createHttpError(403, "Forbidden.");
    return mindmap;
  }

  private async saveMindmap(
    userId: string,
    title: string,
    description: string,
    structure: object,
    action: string,
    actionDetails: string
  ) {
    // JSON round-trip strips non-serialisable values before Prisma sees them
    const serialised = JSON.parse(JSON.stringify(structure));

    const saved = await prisma.mindmap.create({
      data: { title, description, structure: serialised, userId },
    });

    this.logActivity(userId, action, actionDetails);
    return saved;
  }

  // ─── Input → Mindmap ──────────────────────────────────────────────────────

  async createFromAudio(
    fileBuffer: Buffer,
    mimeType: string,
    tokenUserId: string
  ) {
    const structure = await audioToMindmap(fileBuffer, mimeType);
    const title = structure.topic ?? "Audio Mindmap";
    return this.saveMindmap(
      tokenUserId, title,
      "Generated from audio input",
      structure,
      "MINDMAP_FROM_AUDIO",
      `Audio mindmap "${title}" created for user ${tokenUserId}.`
    );
  }

  async createFromDocument(
    fileBuffer: Buffer,
    originalName: string,
    tokenUserId: string
  ) {
    const structure = await documentToMindmap(fileBuffer, originalName);
    const title = (structure.description && structure.description.trim().split(/\s+/).length > 5)
      ? structure.topic
      : (structure.description ?? structure.topic ?? path.basename(originalName, path.extname(originalName))); return this.saveMindmap(
        tokenUserId, title,
        `Generated from document: ${originalName}`,
        structure,
        "MINDMAP_FROM_DOCUMENT",
        `Document mindmap "${title}" created from "${originalName}" for user ${tokenUserId}.`
      );
  }

  async createFromVideo(
    fileBuffer: Buffer,
    mimeType: string,
    tokenUserId: string
  ) {
    const structure = await videoFileToMindmap(fileBuffer, mimeType);
    const title = structure.topic ?? "Video Mindmap";
    return this.saveMindmap(
      tokenUserId, title,
      "Generated from video input",
      structure,
      "MINDMAP_FROM_VIDEO",
      `Video mindmap "${title}" created for user ${tokenUserId}.`
    );
  }

  async createFromYouTube(dto: YouTubeMindmapDto, tokenUserId: string) {    // URL format is already validated by @Matches in YouTubeMindmapDto — no re-check needed here
    const structure = await youtubeToMindmap(dto.youtubeUrl);
    const title = structure.topic ?? "YouTube Mindmap";
    return this.saveMindmap(
      tokenUserId, title,
      `Generated from YouTube: ${dto.youtubeUrl}`,
      structure,
      "MINDMAP_FROM_YOUTUBE",
      `YouTube mindmap "${title}" created from ${dto.youtubeUrl} for user ${tokenUserId}.`
    );
  }

  // ─── Text-to-Audio ────────────────────────────────────────────────────────

  async textToAudio(dto: TextToAudioDto, tokenUserId: string) {
    const result = await ttsTextToAudio(dto.text, {
      voice: dto.voice as TtsVoice,
      speed: dto.speed,
    });

    this.logActivity(
      tokenUserId,
      "TTS_TEXT",
      `TTS generated for text of length ${dto.text.length} by user ${tokenUserId}.`
    );

    return result;
  }

  async mindmapToAudio(dto: MindmapToAudioDto, tokenUserId: string) {
    const mindmap = await this.loadOwnedMindmap(dto.mindmapId, tokenUserId);
    const script = mindmapToNarration(mindmap.structure as unknown as MindmapStructure);

    const result = await ttsTextToAudio(script, {
      voice: dto.voice as TtsVoice,
      speed: dto.speed,
    });

    this.logActivity(
      tokenUserId,
      "TTS_MINDMAP",
      `Mindmap "${mindmap.title}" (${dto.mindmapId}) narrated as audio for user ${tokenUserId}.`
    );

    return result;
  }

  // ─── Neurodivergent features ──────────────────────────────────────────────

  async getChunkedNode(dto: ChunkedNodeDto, tokenUserId: string) {
    const mindmap = await this.loadOwnedMindmap(dto.mindmapId, tokenUserId);
    const structure = mindmap.structure as unknown as MindmapStructure;
    const result = chunkedNodeHelper(structure, dto.nodeIndex);

    if (!result.node) {
      throw createHttpError(
        400,
        `nodeIndex ${dto.nodeIndex} is out of range. Mindmap has ${result.total} nodes (0–${result.total - 1}).`
      );
    }

    this.logActivity(
      tokenUserId,
      "FOCUS_MODE_NODE_VIEWED",
      `User ${tokenUserId} viewed node ${dto.nodeIndex}/${result.total} of mindmap ${dto.mindmapId}.`
    );

    return result;
  }

  async getSimplifiedView(dto: SimplifyMindmapDto, tokenUserId: string) {
    const mindmap = await this.loadOwnedMindmap(dto.mindmapId, tokenUserId);
    let structure = mindmap.structure as unknown as MindmapStructure;

    structure = simplifyChildLabels(structure, dto.maxWordsPerChild ?? 12);
    structure = simplifyMindmap(structure);
    if (dto.addEmojis) structure = addEmojiAnchors(structure);

    this.logActivity(
      tokenUserId,
      "SIMPLIFIED_VIEW_ACCESSED",
      `Simplified view (emojis=${dto.addEmojis}) of mindmap ${dto.mindmapId} for user ${tokenUserId}.`
    );

    return structure;
  }

  async generateQuiz(dto: GenerateQuizDto, tokenUserId: string) {
    const mindmap = await this.loadOwnedMindmap(dto.mindmapId, tokenUserId);
    const questions = quizHelper(mindmap.structure as unknown as MindmapStructure);

    this.logActivity(
      tokenUserId,
      "QUIZ_GENERATED",
      `${questions.length} quiz questions generated for mindmap ${dto.mindmapId} by user ${tokenUserId}.`
    );

    return questions;
  }

  async generateStudyPlan(dto: StudyPlanDto, tokenUserId: string) {
    const mindmap = await this.loadOwnedMindmap(dto.mindmapId, tokenUserId);
    const plan = studyPlanHelper(
      mindmap.structure as unknown as MindmapStructure,
      dto.nodesPerBlock ?? 2
    );

    this.logActivity(
      tokenUserId,
      "STUDY_PLAN_GENERATED",
      `Study plan (${plan.length} blocks) for mindmap ${dto.mindmapId} by user ${tokenUserId}.`
    );

    return plan;
  }

  async getColourCoding(mindmapId: string, tokenUserId: string) {
    // Fixed: was missing validateUserAccess — ownership check alone is not sufficient
    const mindmap = await this.loadOwnedMindmap(mindmapId, tokenUserId);
    const colours = assignColours(mindmap.structure as unknown as MindmapStructure);

    this.logActivity(
      mindmap.userId,
      "COLOUR_CODING_ACCESSED",
      `Colour coding accessed for mindmap ${mindmapId}.`
    );

    return colours;
  }

  async getAnalogyPrompts(mindmapId: string, tokenUserId: string) {
    // Fixed: was missing validateUserAccess — ownership check alone is not sufficient
    const mindmap = await this.loadOwnedMindmap(mindmapId, tokenUserId);
    const prompts = generateAnalogyPrompts(mindmap.structure as unknown as MindmapStructure);

    this.logActivity(
      mindmap.userId,
      "ANALOGY_PROMPTS_ACCESSED",
      `Analogy prompts accessed for mindmap ${mindmapId}.`
    );

    return prompts;
  }
}