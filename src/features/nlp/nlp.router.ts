import { Router } from "express";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { NLPController } from "./nlp.controller";
import { TextDto } from "./nlp.dto";
import { verifyToken } from "../../middlewares/jwtVerifiction";

const nlpRouter = Router();

nlpRouter.post("/summarize",verifyToken, dtoValidation(TextDto), NLPController.summarize);
nlpRouter.post("/detect-toxicity",verifyToken, dtoValidation(TextDto), NLPController.detect);
nlpRouter.post("/sentiment",verifyToken, dtoValidation(TextDto), NLPController.sentiment);
nlpRouter.post("/keywords",verifyToken, dtoValidation(TextDto), NLPController.keywords);
nlpRouter.post("/classify",verifyToken, dtoValidation(TextDto), NLPController.classify);
nlpRouter.post("/entities",verifyToken, dtoValidation(TextDto), NLPController.entities);

export default nlpRouter;
