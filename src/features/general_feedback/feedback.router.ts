import { Router } from "express";
import { FeedbackController } from "./feedback.controller";
import { verifyToken } from "../../middlewares/jwtVerifiction";


const feedbackRouter = Router();
feedbackRouter.use(verifyToken); // All routes require authentication
// ── USER routes ───────────────────────────────────────────────────────────────
feedbackRouter.post("/submit", FeedbackController.submitFeedback);
feedbackRouter.get("/fetch", FeedbackController.getMyFeedbacks);
feedbackRouter.get("/fetch/:feedbackId", FeedbackController.getMyFeedbackById);
feedbackRouter.delete("/:feedbackId", FeedbackController.deleteMyFeedback);

export default feedbackRouter;