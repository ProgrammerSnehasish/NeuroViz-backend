import { Router } from "express";
import { userRouter } from "../features/user/user.router";
import authRouter from "../auth/auth.router";
import { mindmapRouter } from "../features/mindmap/mindmap.router";
import nlpRouter from "../features/nlp/nlp.router";
import teacherRouter from "../features/teachers/teacher.router";
import teacherDashboardRouter from "../features/teachers/Dashboard/teacher.dashboard.router";
import { mindmapExtendedRouter } from "../features/mindmap/new_features/mindmap.extended1.router";

const mainRouter = Router()

// API Routes
mainRouter.use("/users", userRouter);
mainRouter.use("/auth", authRouter);
mainRouter.use("/mindmaps", mindmapRouter);
mainRouter.use("/mindmap/extended", mindmapExtendedRouter) //TODO
mainRouter.use("/nlp", nlpRouter);
// mainRouter.use("/cognitive", cognitiveProfileRouter);
// mainRouter.use("/behavior", behaviorRouter);
// mainRouter.use("/emotion", emotionRouter);
// mainRouter.use("/rooms", roomRouter)
// mainRouter.use("/feedback", feedBackRouter);
// mainRouter.use("/adapt", adaptRouter);
// mainRouter.use("/content", contentRouter);
// mainRouter.use("/admin", adminRouter);
mainRouter.use("/teacher", teacherRouter);
mainRouter.use("/teacherDashboard", teacherDashboardRouter);

export default mainRouter