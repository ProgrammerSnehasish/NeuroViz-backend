import express from "express";
import { getOverview } from "./admin.controller";
import { verifyToken } from "../../middlewares/jwtVerifiction";

const adminRouter = express.Router();

adminRouter.get("/overview", verifyToken, getOverview);

export default adminRouter;
