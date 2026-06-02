import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import createHttpError from "http-errors";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { requireAuth } from "../../middlewares/requireAuth";
import { enforceTeacherOrStudent } from "../../middlewares/enforceTeacherorStudent";
import { MindmapExtendedController } from "./mindmap.extended.controller";

export const mindmapExtendedRouter = Router();
const controller = new MindmapExtendedController();

// ── Multer upload configs ─────────────────────────────────────────────────────
const AUDIO_TYPES    = ["audio/mpeg","audio/mp4","audio/webm","audio/ogg","audio/wav","audio/flac","audio/aac"];
const DOCUMENT_TYPES = ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain","text/markdown"];
const VIDEO_TYPES    = ["video/mp4","video/webm","video/quicktime","video/x-msvideo"];

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

const audioUpload    = createUpload(AUDIO_TYPES,    50);
const documentUpload = createUpload(DOCUMENT_TYPES, 20);
const videoUpload    = createUpload(VIDEO_TYPES,    500);

// ── Auth on all routes ───────────────────────────────────────────────────────
mindmapExtendedRouter.use(requireAuth, verifyToken, enforceTeacherOrStudent);

const getTokenUserId = (req: any): string =>
  req.user?.userId || req.user?.id || req.user?.sub;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT → MINDMAP
// ─────────────────────────────────────────────────────────────────────────────

// 🎙 POST /mindmap/extended/audio
mindmapExtendedRouter.post(
  "/audio",
  audioUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No audio file provided.");
      const { userId, title } = req.body;
      if (!userId || !title) throw createHttpError(400, "userId and title are required.");

      const result = await controller.createFromAudio(
        { userId, title },
        req.file.buffer,
        req.file.mimetype,
        getTokenUserId(req)
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 📄 POST /mindmap/extended/document
mindmapExtendedRouter.post(
  "/document",
  documentUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No document file provided.");
      const { userId, title } = req.body;
      if (!userId || !title) throw createHttpError(400, "userId and title are required.");

      const result = await controller.createFromDocument(
        { userId, title },
        req.file.buffer,
        req.file.originalname,
        getTokenUserId(req)
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 🎬 POST /mindmap/extended/video
mindmapExtendedRouter.post(
  "/video",
  videoUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No video file provided.");
      const { userId, title } = req.body;
      if (!userId || !title) throw createHttpError(400, "userId and title are required.");

      const result = await controller.createFromVideo(
        { userId, title },
        req.file.buffer,
        req.file.mimetype,
        getTokenUserId(req)
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ▶️ POST /mindmap/extended/youtube
mindmapExtendedRouter.post(
  "/youtube",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, title, youtubeUrl } = req.body;
      if (!userId || !title || !youtubeUrl)
        throw createHttpError(400, "userId, title, and youtubeUrl are required.");

      const result = await controller.createFromYouTube(
        { userId, title, youtubeUrl },
        getTokenUserId(req)
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

// 🔊 POST /mindmap/extended/tts/text
mindmapExtendedRouter.post(
  "/tts/text",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, text, voice, speed } = req.body;
      if (!userId || !text) throw createHttpError(400, "userId and text are required.");

      const { buffer, mimeType, estimatedDuration } = await controller.textToAudio(
        { userId, text, voice, speed },
        getTokenUserId(req)
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

// 📢 POST /mindmap/extended/tts/mindmap
mindmapExtendedRouter.post(
  "/tts/mindmap",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, mindmapId, voice, speed } = req.body;
      if (!userId || !mindmapId) throw createHttpError(400, "userId and mindmapId are required.");

      const { buffer, mimeType, estimatedDuration } = await controller.mindmapToAudio(
        { userId, mindmapId, voice, speed },
        getTokenUserId(req)
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

// 🎯 GET /mindmap/extended/:mindmapId/focus?nodeIndex=0
mindmapExtendedRouter.get(
  "/:mindmapId/focus",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);
      const nodeIndex = parseInt((req.query["nodeIndex"] as string) ?? "0", 10);

      if (isNaN(nodeIndex) || nodeIndex < 0)
        throw createHttpError(400, "nodeIndex must be a non-negative integer.");

      const result = await controller.getChunkedNode(
        { userId, mindmapId, nodeIndex },
        userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 🧩 GET /mindmap/extended/:mindmapId/simplified?addEmojis=true&maxWords=12
mindmapExtendedRouter.get(
  "/:mindmapId/simplified",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);
      const addEmojis = req.query["addEmojis"] === "true";
      const maxWords = parseInt((req.query["maxWords"] as string) ?? "12", 10);

      const result = await controller.getSimplifiedView(
        { userId, mindmapId, addEmojis, maxWordsPerChild: maxWords },
        userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ❓ GET /mindmap/extended/:mindmapId/quiz
mindmapExtendedRouter.get(
  "/:mindmapId/quiz",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);

      const result = await controller.generateQuiz(
        { userId, mindmapId },
        userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 📅 GET /mindmap/extended/:mindmapId/study-plan?nodesPerBlock=2
mindmapExtendedRouter.get(
  "/:mindmapId/study-plan",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);
      const nodesPerBlock = parseInt((req.query["nodesPerBlock"] as string) ?? "2", 10);

      const result = await controller.generateStudyPlan(
        { userId, mindmapId, nodesPerBlock },
        userId
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 🎨 GET /mindmap/extended/:mindmapId/colours
mindmapExtendedRouter.get(
  "/:mindmapId/colours",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);

      const result = await controller.getColourCoding(mindmapId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 💬 GET /mindmap/extended/:mindmapId/analogies
mindmapExtendedRouter.get(
  "/:mindmapId/analogies",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mindmapId } = req.params;
      const userId = getTokenUserId(req);

      const result = await controller.getAnalogyPrompts(mindmapId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);
