import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import createHttpError from "http-errors";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { requireAuth } from "../../middlewares/requireAuth";
import { enforceTeacherOrStudent } from "../../middlewares/enforceTeacherorStudent";
import { MindmapExtendedController } from "./mindmap.extended.controller";

export const mindmapExtendedRouter = Router();
const controller = new MindmapExtendedController();

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

mindmapExtendedRouter.use(requireAuth, verifyToken, enforceTeacherOrStudent);

/** Extracts the authenticated user's ID from the JWT payload. */
const getTokenUserId = (req: any): string =>
  req.user?.userId ?? req.user?.id ?? req.user?.sub;

/**
 * Validates that the userId in the request body matches the token.
 * Throws 403 if they differ — prevents one user acting as another.
 */
function assertOwnership(req: any, bodyUserId: string): void {
  const tokenUserId = getTokenUserId(req);
  if (!tokenUserId) throw createHttpError(401, "Token missing user identity.");
  if (tokenUserId !== bodyUserId)
    throw createHttpError(403, "userId in body does not match authenticated user.");
}

/** Sanitises a plain string field from multipart form data. */
function sanitiseField(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim())
    throw createHttpError(400, `${name} must be a non-empty string.`);
  return value.trim();
}

// ── Audio ────────────────────────────────────────────────────────────────────
mindmapExtendedRouter.post(
  "/audio",
  audioUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No audio file provided.");

      const userId = sanitiseField(req.body.userId, "userId");
      const title  = sanitiseField(req.body.title,  "title");
      assertOwnership(req, userId);

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

// ── Document ─────────────────────────────────────────────────────────────────
mindmapExtendedRouter.post(
  "/document",
  documentUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No document file provided.");

      const userId = sanitiseField(req.body.userId, "userId");
      const title  = sanitiseField(req.body.title,  "title");
      assertOwnership(req, userId);

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

// ── Video ─────────────────────────────────────────────────────────────────────
mindmapExtendedRouter.post(
  "/video",
  videoUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createHttpError(400, "No video file provided.");

      const userId = sanitiseField(req.body.userId, "userId");
      const title  = sanitiseField(req.body.title,  "title");
      assertOwnership(req, userId);

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

// ── YouTube ───────────────────────────────────────────────────────────────────
mindmapExtendedRouter.post(
  "/youtube",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId     = sanitiseField(req.body.userId,     "userId");
      const title      = sanitiseField(req.body.title,      "title");
      const youtubeUrl = sanitiseField(req.body.youtubeUrl, "youtubeUrl");
      assertOwnership(req, userId);

      // Basic YouTube URL guard
      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(youtubeUrl))
        throw createHttpError(400, "youtubeUrl must be a valid YouTube URL.");

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

// ── TTS: text ─────────────────────────────────────────────────────────────────
mindmapExtendedRouter.post(
  "/tts/text",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = sanitiseField(req.body.userId, "userId");
      const text   = sanitiseField(req.body.text,   "text");
      assertOwnership(req, userId);

      const { voice, speed } = req.body;

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

// ── TTS: mindmap ──────────────────────────────────────────────────────────────
mindmapExtendedRouter.post(
  "/tts/mindmap",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId    = sanitiseField(req.body.userId,    "userId");
      const mindmapId = sanitiseField(req.body.mindmapId, "mindmapId");
      assertOwnership(req, userId);

      const { voice, speed } = req.body;

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

// ── Neurodivergent routes (unchanged — token userId used directly) ────────────

mindmapExtendedRouter.get("/:mindmapId/focus", async (req, res, next) => {
  try {
    const { mindmapId } = req.params;
    const userId = getTokenUserId(req);
    const nodeIndex = parseInt((req.query["nodeIndex"] as string) ?? "0", 10);
    if (isNaN(nodeIndex) || nodeIndex < 0)
      throw createHttpError(400, "nodeIndex must be a non-negative integer.");
    const result = await controller.getChunkedNode({ userId, mindmapId, nodeIndex }, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

mindmapExtendedRouter.get("/:mindmapId/simplified", async (req, res, next) => {
  try {
    const { mindmapId } = req.params;
    const userId = getTokenUserId(req);
    const addEmojis = req.query["addEmojis"] === "true";
    const maxWords = parseInt((req.query["maxWords"] as string) ?? "12", 10);
    const result = await controller.getSimplifiedView(
      { userId, mindmapId, addEmojis, maxWordsPerChild: maxWords }, userId
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

mindmapExtendedRouter.get("/:mindmapId/quiz", async (req, res, next) => {
  try {
    const { mindmapId } = req.params;
    const userId = getTokenUserId(req);
    const result = await controller.generateQuiz({ userId, mindmapId }, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

mindmapExtendedRouter.get("/:mindmapId/study-plan", async (req, res, next) => {
  try {
    const { mindmapId } = req.params;
    const userId = getTokenUserId(req);
    const nodesPerBlock = parseInt((req.query["nodesPerBlock"] as string) ?? "2", 10);
    const result = await controller.generateStudyPlan(
      { userId, mindmapId, nodesPerBlock }, userId
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

mindmapExtendedRouter.get("/:mindmapId/colours", async (req, res, next) => {
  try {
    const { mindmapId } = req.params;
    const userId = getTokenUserId(req);
    const result = await controller.getColourCoding(mindmapId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

mindmapExtendedRouter.get("/:mindmapId/analogies", async (req, res, next) => {
  try {
    const { mindmapId } = req.params;
    const userId = getTokenUserId(req);
    const result = await controller.getAnalogyPrompts(mindmapId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});