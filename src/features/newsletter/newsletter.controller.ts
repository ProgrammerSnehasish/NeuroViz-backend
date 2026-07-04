import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { NewsletterService } from "./newsletter.service";

const getUserId = (req: Request): string =>
  (req.user as any)?.id ||
  (req.user as any)?.userId ||
  (req.user as any)?._id;

export const NewsletterController = {

  // ── ADMIN ──────────────────────────────────────────────────────────────────

  /** POST /newsletter */
  createNewsletter: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await NewsletterService.createNewsletter(getUserId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /newsletter */
  getAllNewsletters: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await NewsletterService.getAllNewsletters();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /newsletter/:newsletterId */
  getNewsletterById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await NewsletterService.getNewsletterById(req.params.newsletterId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /newsletter/:newsletterId */
  updateNewsletter: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await NewsletterService.updateNewsletter(getUserId(req), req.params.newsletterId as string, req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /newsletter/:newsletterId */
  deleteNewsletter: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await NewsletterService.deleteNewsletter(getUserId(req), req.params.newsletterId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /newsletter/:newsletterId/send */
  sendNewsletter: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await NewsletterService.sendNewsletter(getUserId(req), req.params.newsletterId as string, req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /newsletter/:newsletterId/logs */
  getNewsletterLogs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await NewsletterService.getNewsletterLogs(req.params.newsletterId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /newsletter/subscribers */
  getAllSubscribers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const onlyActive = req.query.active === "true";
      const data = await NewsletterService.getAllSubscribers(onlyActive);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── PUBLIC ─────────────────────────────────────────────────────────────────

  /** POST /newsletter/subscribe */
  subscribe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name } = req.body;
      const data = await NewsletterService.subscribe(email, name);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /newsletter/unsubscribe */
  unsubscribe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = (req.query.email as string) || req.body.email;
      const token = (req.query.token as string) || req.body.token;
      if (!email) throw createHttpError(400, "Email is required.");
      const data = await NewsletterService.unsubscribe(email, token);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};