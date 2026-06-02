import createHttpError from "http-errors";
import { MindmapExtendedService } from "./mindmap.extended.service";
import {
  AudioMindmapDto,
  DocumentMindmapDto,
  VideoMindmapDto,
  YouTubeMindmapDto,
  TextToAudioDto,
  MindmapToAudioDto,
  ChunkedNodeDto,
  GenerateQuizDto,
  StudyPlanDto,
  SimplifyMindmapDto,
} from "./mindmap.extended.dto";

export class MindmapExtendedController {
  private service: MindmapExtendedService;

  constructor(service?: MindmapExtendedService) {
    this.service = service ?? new MindmapExtendedService();
  }

  // ─── Shared error wrapper ─────────────────────────────────────────────────

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      // Re-throw existing HTTP errors (from http-errors or our router) as-is
      if (err.status) throw err;
      // Wrap unexpected service/infra errors as 500
      throw createHttpError(500, err.message ?? "Internal server error");
    }
  }

  // ─── Input → Mindmap ──────────────────────────────────────────────────────

  public createFromAudio(
    dto: AudioMindmapDto,
    fileBuffer: Buffer,
    mimeType: string,
    tokenUserId: string
  ) {
    return this.run(() =>
      this.service.createFromAudio(dto, fileBuffer, mimeType, tokenUserId)
    );
  }

  public createFromDocument(
    dto: DocumentMindmapDto,
    fileBuffer: Buffer,
    originalName: string,
    tokenUserId: string
  ) {
    return this.run(() =>
      this.service.createFromDocument(dto, fileBuffer, originalName, tokenUserId)
    );
  }

  public createFromVideo(
    dto: VideoMindmapDto,
    fileBuffer: Buffer,
    mimeType: string,
    tokenUserId: string
  ) {
    return this.run(() =>
      this.service.createFromVideo(dto, fileBuffer, mimeType, tokenUserId)
    );
  }

  public createFromYouTube(dto: YouTubeMindmapDto, tokenUserId: string) {
    return this.run(() => this.service.createFromYouTube(dto, tokenUserId));
  }

  // ─── Text-to-Audio (TTS) ──────────────────────────────────────────────────

  public textToAudio(dto: TextToAudioDto, tokenUserId: string) {
    return this.run(() => this.service.textToAudio(dto, tokenUserId));
  }

  public mindmapToAudio(dto: MindmapToAudioDto, tokenUserId: string) {
    return this.run(() => this.service.mindmapToAudio(dto, tokenUserId));
  }

  // ─── Neurodivergent features ──────────────────────────────────────────────

  public getChunkedNode(dto: ChunkedNodeDto, tokenUserId: string) {
    return this.run(() => this.service.getChunkedNode(dto, tokenUserId));
  }

  public getSimplifiedView(dto: SimplifyMindmapDto, tokenUserId: string) {
    return this.run(() => this.service.getSimplifiedView(dto, tokenUserId));
  }

  public generateQuiz(dto: GenerateQuizDto, tokenUserId: string) {
    return this.run(() => this.service.generateQuiz(dto, tokenUserId));
  }

  public generateStudyPlan(dto: StudyPlanDto, tokenUserId: string) {
    return this.run(() => this.service.generateStudyPlan(dto, tokenUserId));
  }

  public getColourCoding(mindmapId: string, tokenUserId: string) {
    return this.run(() => this.service.getColourCoding(mindmapId, tokenUserId));
  }

  public getAnalogyPrompts(mindmapId: string, tokenUserId: string) {
    return this.run(() => this.service.getAnalogyPrompts(mindmapId, tokenUserId));
  }
}