import express from "express";
import { getProfile } from "./cognitiveProfile.controller";

import { verifyToken } from "../../middlewares/jwtVerifiction";

const cognitiveProfileRouter = express.Router();

cognitiveProfileRouter.get("/user/:userId", verifyToken, getProfile);

export default cognitiveProfileRouter;
