import express from "express";
import { getProfile } from "./cognitiveProfile.controller";

import { verifyToken } from "../../middlewares/jwtVerifiction";
import { enforceTeacherOrStudent } from "../../middlewares/enforceTeacherorStudent";

const cognitiveProfileRouter = express.Router();

cognitiveProfileRouter.get("/user/:userId", verifyToken, enforceTeacherOrStudent, getProfile);

export default cognitiveProfileRouter;
