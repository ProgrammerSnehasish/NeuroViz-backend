import { Router } from "express";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { NLPController } from "./nlp.controller";
import { TextDto } from "./nlp.dto";
import { verifyToken } from "../../middlewares/jwtVerifiction";

const nlpRouter = Router();

nlpRouter.post("/summarize",verifyToken, dtoValidation(TextDto), NLPController.summarize);
nlpRouter.post("/detect-toxicity", dtoValidation(TextDto), NLPController.detect);
nlpRouter.post("/sentiment", dtoValidation(TextDto), NLPController.sentiment);
nlpRouter.post("/keywords", dtoValidation(TextDto), NLPController.keywords);
nlpRouter.post("/classify", dtoValidation(TextDto), NLPController.classify);
nlpRouter.post("/entities", dtoValidation(TextDto), NLPController.entities);

export default nlpRouter;
