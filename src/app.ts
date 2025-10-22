import express, { Request, Response, json, urlencoded } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middlewares/errorHandler";
import { responseHandler } from "./middlewares/responseHandler";
import mainRouter from "./base/base.router";

dotenv.config();

const app = express();

// 🧩 Core Middlewares
app.use(json());
app.use(cors());
app.use(urlencoded({ extended: true }));

// 🧠 API Routes
app.use("/api", mainRouter);

// 🩺 Health Check Endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "NeuroViz Backend API is up and running 🚀",
  });
});

// ⚠️ Global Handlers
app.use(errorHandler);
app.use(responseHandler);

export default app;
