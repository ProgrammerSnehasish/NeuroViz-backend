import { Router } from "express";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { NLPController } from "./nlp.controller";
import { TextDto } from "./nlp.dto";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { requireAuth } from "../../middlewares/requireAuth";

const nlpRouter = Router();

nlpRouter.use(requireAuth, verifyToken) // All NLP routes require authentication

nlpRouter.post("/summarize", dtoValidation(TextDto), NLPController.summarize);
nlpRouter.post("/detect-toxicity", dtoValidation(TextDto), NLPController.detect);
nlpRouter.post("/sentiment", dtoValidation(TextDto), NLPController.sentiment);
nlpRouter.post("/keywords", dtoValidation(TextDto), NLPController.keywords);
nlpRouter.post("/classify", dtoValidation(TextDto), NLPController.classify);
nlpRouter.post("/entities", dtoValidation(TextDto), NLPController.entities);

export default nlpRouter;
