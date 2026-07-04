import { Router } from "express";
import { enforceAdmin } from "../../middlewares/enforceAdmin";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { NewsletterController } from "./newsletter.controller";
import {
    CreateNewsletterDto,
    UpdateNewsletterDto,
    SubscribeNewsletterDto,
    UnsubscribeNewsletterDto,
    SendNewsletterDto,
} from "./newsletter.dto";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import rateLimit  from "express-rate-limit";

const newsletterRouter = Router();
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {success: false, message: "Too many subscription attempts, please try again later."}
});

// ── PUBLIC routes ─────────────────────────────────────────────────────────────
newsletterRouter.post("/subscribe", subscribeLimiter, dtoValidation(SubscribeNewsletterDto), NewsletterController.subscribe);
newsletterRouter.post("/unsubscribe", subscribeLimiter, dtoValidation(UnsubscribeNewsletterDto), NewsletterController.unsubscribe);

// ── ADMIN routes ──────────────────────────────────────────────────────────────
newsletterRouter.post("/createDraft", verifyToken, enforceAdmin, dtoValidation(CreateNewsletterDto), NewsletterController.createNewsletter);
newsletterRouter.get("/fetchAll", verifyToken, enforceAdmin, NewsletterController.getAllNewsletters);
newsletterRouter.get("/subscribers", verifyToken, enforceAdmin, NewsletterController.getAllSubscribers);
newsletterRouter.get("/:newsletterId", verifyToken, enforceAdmin, NewsletterController.getNewsletterById);
newsletterRouter.patch("/:newsletterId", verifyToken, enforceAdmin, dtoValidation(UpdateNewsletterDto), NewsletterController.updateNewsletter);
newsletterRouter.delete("/:newsletterId", verifyToken, enforceAdmin, NewsletterController.deleteNewsletter);
newsletterRouter.post("/:newsletterId/send", verifyToken, enforceAdmin, dtoValidation(SendNewsletterDto), NewsletterController.sendNewsletter);
newsletterRouter.get("/:newsletterId/logs", verifyToken, enforceAdmin, NewsletterController.getNewsletterLogs);

export default newsletterRouter;