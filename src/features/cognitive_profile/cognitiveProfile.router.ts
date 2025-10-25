import express from "express";
import { updateProfile, getProfile } from "./cognitiveProfile.controller";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { CognitiveProfileDto } from "./cognitiveProfile.dto";
import { verifyToken } from "../../middlewares/jwtVerifiction";

const cognitiveProfileRouter = express.Router();

cognitiveProfileRouter.post("/update", verifyToken, dtoValidation(CognitiveProfileDto), updateProfile);
cognitiveProfileRouter.get("/user/:userId", verifyToken, getProfile);

export default cognitiveProfileRouter;
