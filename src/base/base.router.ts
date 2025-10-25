import { Router } from "express";
import { userRouter } from "../features/user/user.router";
import authRouter from "../auth/auth.router";
import { mindmapRouter } from "../features/mindmap/mindmap.router";
import nlpRouter from "../features/nlp/nlp.router";
import cognitiveProfileRouter from "../features/cognitive_profile/cognitiveProfile.router";
import emotionRouter from "../features/emotion/emotion.router";
import feedBackRouter from "../features/feedback/feedback.router";
import adaptRouter from "../features/adapt/adapt.router";
import contentRouter from "../features/content/content.router";
import adminRouter from "../features/admin/admin.router";

const mainRouter = Router()

// 🧠 API Routes
mainRouter.use("/users", userRouter);
mainRouter.use("/auth",authRouter);
mainRouter.use("/mindmaps", mindmapRouter);
mainRouter.use("/nlp",nlpRouter);
mainRouter.use("/cognitive", cognitiveProfileRouter);
mainRouter.use("/emotion", emotionRouter);
mainRouter.use("/feedback", feedBackRouter);
mainRouter.use("/adapt", adaptRouter);
mainRouter.use("/content", contentRouter);
mainRouter.use("/admin", adminRouter);

export default mainRouter