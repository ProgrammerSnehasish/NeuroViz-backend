import express from "express";
import { summarize } from "./content.controller";
import { verifyToken } from "../../middlewares/jwtVerifiction";


const contentRouter = express.Router();

contentRouter.post("/summarize", verifyToken, summarize);

export default contentRouter;
