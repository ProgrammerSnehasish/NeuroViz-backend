import { Request, Response, NextFunction } from "express";
import * as chatbotService from "./chatbot.service";

// Adjust this to however your auth middleware actually attaches the user.
// Shown here as req.user.id, matching the pattern implied by your existing
// authRouter/requireAuth setup.
function getUserId(req: Request): string {
  const userId = (req.user as any)?.id ||
  (req.user as any)?.userId ||
  (req.user as any)?._id;

  if (!userId) throw new Error("Unauthenticated request reached chatbot controller.");
  return userId;
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const { sessionId, message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required." });
    }

    const result = await chatbotService.sendMessage(userId, sessionId, message.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function sendMessageWithImage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const { sessionId, message } = req.body;
    const file = (req as any).file; // requires multer upstream in the router

    if (!file) {
      return res.status(400).json({ error: "file is required." });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required." });
    }

    const result = await chatbotService.sendMessageWithImage(
      userId,
      sessionId,
      message.trim(),
      file.buffer,
      file.originalname,
      file.mimetype
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const sessionId = req.params.sessionId as string;
    const history = await chatbotService.getHistory(userId, sessionId);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const sessions = await chatbotService.listSessions(userId);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

export async function deleteSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const sessionId = req.params.sessionId as string;
    const result = await chatbotService.deleteSession(userId, sessionId);

    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
