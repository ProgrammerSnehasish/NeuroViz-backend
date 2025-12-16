import express from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { trackBehavior } from "./behavior.controller";
import rateLimit from "express-rate-limit";

const behaviorRouter = express.Router();
const behaviorLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // limit each IP to 60 requests per windowMs
  message: "Too many behavior tracking requests from this IP, please try again after a minute",
});

behaviorRouter.post("/track", verifyToken, behaviorLimiter, trackBehavior);

export default behaviorRouter;