import express from "express";
import { addEmotion, fetchEmotions } from "./emotion.controller";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { EmotionDto } from "./emotion.dto";
import { verifyToken } from "../../middlewares/jwtVerifiction";

const emotionRouter = express.Router();

emotionRouter.post("/log", verifyToken, dtoValidation(EmotionDto), addEmotion);
emotionRouter.get("/user/:userId", verifyToken, fetchEmotions);

export default emotionRouter;
