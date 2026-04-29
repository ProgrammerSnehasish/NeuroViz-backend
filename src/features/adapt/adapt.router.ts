import express from "express";
import { triggerAdaptation } from "./adapt.controller";
import { verifyToken } from "../../middlewares/jwtVerifiction";

const adaptRouter = express.Router();

adaptRouter.post("/trigger/user/:userId", verifyToken, triggerAdaptation);

export default adaptRouter;
