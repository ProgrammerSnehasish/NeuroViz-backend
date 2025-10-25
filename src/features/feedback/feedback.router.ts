import express from "express";
import { addFeedback, getUserFeedback } from "./feedback.controller";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { FeedbackDto } from "./feedback.dto";
import { verifyToken } from "../../middlewares/jwtVerifiction";

const feedBackRouter = express.Router();

feedBackRouter.post("/add", verifyToken, dtoValidation(FeedbackDto), addFeedback);
feedBackRouter.get("/user/:userId", verifyToken, getUserFeedback);

export default feedBackRouter;
