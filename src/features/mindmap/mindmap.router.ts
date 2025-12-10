import { Router, Request, Response, NextFunction } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { MindmapController } from "./mindmap.controller";
import { CreateMindmapDto, GenerateMindmapDto, UpdateMindmapDto } from "./mindmap.dto";
import createHttpError from "http-errors";
import { MindmapExportController } from "./export/mindmap.export.controller";

export const mindmapRouter = Router();
const controller = new MindmapController();

const getTokenUserId = (req: any) => 
    req.user?.userId ||
    req.user?.id ||
    req.user?.sub; // support multiple JWT payload formats

mindmapRouter.post(
  "/create",
  verifyToken,
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

mindmapRouter.post(
  "/generate",
  verifyToken,
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

mindmapRouter.get(
  "/user/:userId",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params["userId"];
      const tokenUserId = getTokenUserId(req);

      if (!userId) throw createHttpError("Missing path parameter: userId");

      const mindmaps = await controller.getMindmapsByUser(userId, tokenUserId);
      res.status(200).json(mindmaps);
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get(
  "/:mindmapId",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mindmapId = req.params["mindmapId"];
      const tokenUserId = getTokenUserId(req);
      if (!mindmapId) throw createHttpError("Missing path parameter: mindmapId");
      const mindmap = await controller.getMindmapById(mindmapId, tokenUserId);
      res.status(200).json(mindmap);
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.put(
  "/update/:mindmapId",
  verifyToken,
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

      const updated = await controller.updateMindmap(req.body, mindmapId, userId, tokenUserId);

      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
);


mindmapRouter.delete(
  "/delete/:mindmapId",
  verifyToken,
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

      await controller.deleteMindmap(mindmapId, userId, tokenUserId);

      res.status(200).json({
        success: true,
        message: "Mindmap deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

mindmapRouter.get("/:id/pdf", verifyToken, MindmapExportController.downloadPDF);
mindmapRouter.get("/:id/jpeg", verifyToken, MindmapExportController.downloadJPEG);