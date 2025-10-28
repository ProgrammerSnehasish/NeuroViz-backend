import { Router, Request, Response, NextFunction } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { MindmapController } from "./mindmap.controller";
import { CreateMindmapDto, GenerateMindmapDto, UpdateMindmapDto } from "./mindmap.dto";
import createHttpError from "http-errors";

export const mindmapRouter = Router();
const controller = new MindmapController();

mindmapRouter.post(
  "/create",
  verifyToken,
  dtoValidation(CreateMindmapDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const result = await controller.createMindmap(data);
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
      const result = await controller.createMindmapFromText(data);
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
      if (!userId) throw createHttpError("Missing path parameter: userId");
      const mindmaps = await controller.getMindmapsByUser(userId);
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
      if (!mindmapId) throw createHttpError("Missing path parameter: mindmapId");
      const mindmap = await controller.getMindmapById(mindmapId);
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

      const updated = await controller.updateMindmap(req.body, mindmapId, userId);

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

      await controller.deleteMindmap(mindmapId, userId);

      res.status(200).json({
        success: true,
        message: "Mindmap deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

