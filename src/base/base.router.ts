import { Router } from "express";
import { userRouter } from "../features/user/user.router";
import authRouter from "../auth/auth.router";

const mainRouter = Router()

// 🧠 API Routes
mainRouter.use("/users", userRouter);
mainRouter.use("/auth",authRouter);
// mainRouter.use("/mindmaps", mindmapRoutes);

export default mainRouter