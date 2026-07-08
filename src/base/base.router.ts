import { Router } from "express";
import { userRouter } from "../features/user/user.router";
import authRouter from "../auth/auth.router";
import { mindmapRouter } from "../features/mindmap/mindmap.router";
import nlpRouter from "../features/nlp/nlp.router";
import teacherRouter from "../features/teachers/teacher.router";
import roomRouter from "../features/live_class/room.routes";
import feedbackRouter from "../features/general_feedback/feedback.router";
import newsletterRouter from "../features/newsletter/newsletter.router";
import adminRouter from "../features/admin/admin.router";
import studentRouter from "../features/student/student.router";
import chatRouter from "../features/chat/chat.router";

const mainRouter = Router()

// API Routes
mainRouter.use("/users", userRouter);
mainRouter.use("/auth", authRouter);
mainRouter.use("/mindmap", mindmapRouter);
mainRouter.use("/nlp", nlpRouter);
mainRouter.use("/rooms", roomRouter);
mainRouter.use("/teacher", teacherRouter);
mainRouter.use("/feedback", feedbackRouter);
mainRouter.use("/newsletter", newsletterRouter);
mainRouter.use("/admin", adminRouter);
mainRouter.use("/student", studentRouter);
mainRouter.use("/chat", chatRouter);
// mainRouter.use("/cognitive", cognitiveProfileRouter);
// mainRouter.use("/behavior", behaviorRouter);
// mainRouter.use("/emotion", emotionRouter);
// mainRouter.use("/adapt", adaptRouter);
// mainRouter.use("/content", contentRouter);



export default mainRouter