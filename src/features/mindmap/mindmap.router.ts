import { Router, Request, Response, NextFunction } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { MindmapController } from "./controller/mindmap.controller";
import createHttpError from "http-errors";
import { MindmapExportController } from "./controller/mindmap.export.controller";
import { enforceTeacherOrStudent } from "../../middlewares/enforceTeacherorStudent";
import { requireAuth } from "../../middlewares/requireAuth";
import { CreateMindmapDto, GenerateMindmapDto, UpdateMindmapDto } from "./dto/mindmap.dto";
import multer from "multer";
import { MindmapExtendedController } from "./controller/mindmap.extended.controller";
import { MindmapFeedbackController } from "./feedback/mindmap-feedback.controller";

export const mindmapRouter = Router();
const controller = new MindmapController();
const extendedController = new MindmapExtendedController();

// ── Multer upload configs ─────────────────────────────────────────────────────
const AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav", "audio/flac", "audio/aac"];
const DOCUMENT_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

function createUpload(allowed: string[], maxMB: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error(`Unsupported file type: ${file.mimetype}`));
    },
  });
}

const audioUpload = createUpload(AUDIO_TYPES, 50);
const documentUpload = createUpload(DOCUMENT_TYPES, 20);
const videoUpload = createUpload(VIDEO_TYPES, 500);

// ── Auth on all routes ───────────────────────────────────────────────────────

const getTokenUserId = (req: any) =>
  req.user?.userId ||
  req.user?.id ||
  req.user?.sub; // support multiple JWT payload formats

mindmapRouter.use(requireAuth, verifyToken, enforceTeacherOrStudent)

mindmapRouter.post(
  "/create",
  dtoValidation(CreateMindmapDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const tokenUserId = getTokenUserId(req);
      const result = await controller.createMindmap(data, tokenUserId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// INPUT → MINDMAP
// ─────────────────────────────────────────────────────────────────────────────

mindmapRouter.post(
  "/generate",
  dtoValidation(GenerateMindmapDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const tokenUserId = getTokenUserId(req);
      const result = await controller.createMindmapFromText(data, tokenUserId);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.post(
  "/audio",
  audioUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No audio file provided.");
      const tokenUserId = getTokenUserId(req);

      const result = await extendedController.createFromAudio(
        req.file.buffer,
        req.file.mimetype,
        tokenUserId
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.post(
  "/document",
  documentUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No document file provided.");
      const tokenUserId = getTokenUserId(req);

      const result = await extendedController.createFromDocument(
        req.file.buffer,
        req.file.originalname,
        tokenUserId
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.post(
  "/video",
  videoUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No video file provided.");
      const tokenUserId = getTokenUserId(req);

      const result = await extendedController.createFromVideo(
        req.file.buffer,
        req.file.mimetype,
        tokenUserId
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.post(
  "/youtube",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { youtubeUrl } = req.body;
      if (!youtubeUrl)
        throw createHttpError(400, "YouTube URL is required.");
      const tokenUserId = getTokenUserId(req);

      const result = await extendedController.createFromYouTube(
        { youtubeUrl },
        tokenUserId
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TEXT-TO-AUDIO (TTS)
// ─────────────────────────────────────────────────────────────────────────────

mindmapRouter.post(
  "/tts/text",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text, voice, speed } = req.body;
      if (!text) throw createHttpError(400, "Text is required.");
      const tokenUserId = getTokenUserId(req);

      const { buffer, mimeType, estimatedDuration } = await extendedController.textToAudio(
        { text, voice, speed },
        tokenUserId
      );

      res.set({
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "X-Estimated-Duration": String(estimatedDuration),
        "Content-Disposition": `attachment; filename="tts_${Date.now()}.mp3"`,
      });
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.post(
  "/tts/mindmap",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId, voice, speed } = req.body;
      if (!mindmapId) throw createHttpError(400, "mindmapId is required.");
      const tokenUserId = getTokenUserId(req);

      const { buffer, mimeType, estimatedDuration } = await extendedController.mindmapToAudio(
        { mindmapId, voice, speed },
        tokenUserId
      );

      res.set({
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "X-Estimated-Duration": String(estimatedDuration),
        "Content-Disposition": `attachment; filename="narration_${mindmapId}.mp3"`,
      });
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// NEURODIVERGENT FEATURES
// ─────────────────────────────────────────────────────────────────────────────

mindmapRouter.get(
  "/:mindmapId/focus",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);
      const nodeIndex = parseInt((req.query["nodeIndex"] as string) ?? "0", 10);

      if (isNaN(nodeIndex) || nodeIndex < 0)
        throw createHttpError(400, "nodeIndex must be a non-negative integer.");

      const result = await extendedController.getChunkedNode(
        { mindmapId: mindmapId as string, nodeIndex },
        userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get(
  "/:mindmapId/simplified",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);
      const addEmojis = req.query["addEmojis"] === "true";
      const maxWords = parseInt((req.query["maxWords"] as string) ?? "12", 10);

      const result = await extendedController.getSimplifiedView(
        { mindmapId: mindmapId as string, addEmojis, maxWordsPerChild: maxWords },
        userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get(
  "/:mindmapId/quiz",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);

      const result = await extendedController.generateQuiz(
        { mindmapId: mindmapId as string },
        userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get(
  "/:mindmapId/study-plan",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);
      const nodesPerBlock = parseInt((req.query["nodesPerBlock"] as string) ?? "2", 10);

      const result = await extendedController.generateStudyPlan(
        { mindmapId: mindmapId as string, nodesPerBlock },
        userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get(
  "/:mindmapId/colours",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);

      const result = await extendedController.getColourCoding(mindmapId as string, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get(
  "/:mindmapId/analogies",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);

      const result = await extendedController.getAnalogyPrompts(mindmapId as string, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Others
// ─────────────────────────────────────────────────────────────────────────────

mindmapRouter.get(
  "/user/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params["userId"];

      if (!userId) throw createHttpError("Missing path parameter: userId");

      const mindmaps = await controller.getMindmapsByUser(userId as string);
      res.status(200).json(mindmaps);
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get(
  "/:mindmapId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mindmapId = req.params["mindmapId"];
      const tokenUserId = getTokenUserId(req);
      if (!mindmapId) throw createHttpError("Missing path parameter: mindmapId");
      const mindmap = await controller.getMindmapById(mindmapId as string);
      res.status(200).json(mindmap);
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.put(
  "/update/:mindmapId",
  dtoValidation(UpdateMindmapDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mindmapId = req.params["mindmapId"];
      if (!mindmapId) throw createHttpError(400, "Missing path parameter: mindmapId");

      const userId =
        (req as any).user?.userId ||
        (req as any).user?.id ||
        (req as any).user?.sub; // support multiple JWT payload formats

      if (!userId) throw createHttpError(401, "Unauthorized");

      const tokenUserId = getTokenUserId(req);

      const updated = await controller.updateMindmap(req.body, mindmapId as string, userId, tokenUserId);

      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
);


mindmapRouter.delete(
  "/delete/:mindmapId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mindmapId = req.params["mindmapId"];
      if (!mindmapId) throw createHttpError("Missing path parameter: mindmapId");

      const userId =
        (req.user as any)?.userId ||
        (req.user as any)?.id ||
        (req.user as any)?.sub;

      if (!userId) throw createHttpError(401, "Unauthorized");

      const tokenUserId = getTokenUserId(req);

      await controller.deleteMindmap(mindmapId as string, tokenUserId);

      res.status(200).json({
        success: true,
        message: "Mindmap deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get("/:id/pdf", MindmapExportController.downloadPDF);
mindmapRouter.get("/:id/jpeg", MindmapExportController.downloadJPEG);

// ─────────────────────────────────────────────────────────────────────────────
// MINDMAP FEEDBACK Routes
// ─────────────────────────────────────────────────────────────────────────────

mindmapRouter.post("/feedback", MindmapFeedbackController.giveFeedback);
mindmapRouter.get("/my/feedbacks", MindmapFeedbackController.getMyFeedbacks);
mindmapRouter.get("/:mapId/all/feedbacks", MindmapFeedbackController.getFeedbacksForMindmap);
mindmapRouter.get("/:mapId/my/feedback", MindmapFeedbackController.getMyFeedbackForMindmap);
mindmapRouter.patch("/:feedbackId", MindmapFeedbackController.updateFeedback);
mindmapRouter.delete("/:feedbackId", MindmapFeedbackController.deleteFeedback);