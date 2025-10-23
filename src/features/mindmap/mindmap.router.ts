import { Router, Request, Response, NextFunction } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { MindmapController } from "./mindmap.controller";
import { CreateMindmapDto, UpdateMindmapDto } from "./mindmap.dto";
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
      if (!mindmapId) throw createHttpError("Missing path parameter: mindmapId");
      const userId = req.body.token.userId;
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
      const userId = req.body.token.userId;
      await controller.deleteMindmap(mindmapId, userId);
      res.status(200).json({Success:true, message: "Mindmap deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);
