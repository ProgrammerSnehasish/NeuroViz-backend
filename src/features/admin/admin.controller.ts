import { Request, Response, NextFunction } from "express";
import { AdminService } from "./admin.service";

const getAdminId = (req: Request): string =>
  (req.user as any)?.id ||
  (req.user as any)?.userId ||
  (req.user as any)?._id;

export const AdminController = {

  // ── Dashboard ──────────────────────────────────────────────────────────────

  /** GET /admin/overview */
  overview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getSystemOverview();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /admin/health */
  health: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getSystemHealth();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /admin/activity/logs */
  activityLogs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        userId: req.query.userId as string | undefined,
        action: req.query.action as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      const data = await AdminService.getActivityLogs(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── User Management ────────────────────────────────────────────────────────

  /** GET /admin/users */
  getUsers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        role: req.query.role as string | undefined,
        isActive: req.query.isActive !== undefined
          ? req.query.isActive === "true"
          : undefined,
        search: req.query.search as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      const data = await AdminService.getAllUsers(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /admin/user/:userId */
  getUserById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getUserById(req.params.userId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /admin/user/status */
  updateStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isActive } = req.body;
      const data = await AdminService.updateUserStatus(userId, isActive);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /admin/user/:userId */
  deleteUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.deleteUser(getAdminId(req), req.params.userId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /admin/user/:userId/reset */
  resetUserData: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.resetUserData(getAdminId(req), req.params.userId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Site Feedback ──────────────────────────────────────────────────────────

  /** GET /admin/feedback */
  getAllFeedbacks: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        type: req.query.type as string | undefined,
        status: req.query.status as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      const data = await AdminService.getAllFeedbacks(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /admin/feedback/stats */
  getFeedbackStats: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getFeedbackStats();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /admin/feedback/:feedbackId */
  getFeedbackById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getFeedbackById(req.params.feedbackId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /admin/feedback/:feedbackId/status */
  updateFeedbackStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.updateFeedbackStatus(
        getAdminId(req),
        req.params.feedbackId as string,
        req.body
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /admin/feedback/:feedbackId */
  deleteFeedback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.deleteFeedback(getAdminId(req), req.params.feedbackId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Mail Logs ──────────────────────────────────────────────────────────────

  /** GET /admin/mail/logs */
  getMailStats: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      const data = await AdminService.getMailStats(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Newsletter Stats ───────────────────────────────────────────────────────
  getNewsletterStats: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getNewsletterStats();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Teacher-Student ────────────────────────────────────────────────────────
  getAllTeacherStudentLinks: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      const data = await AdminService.getAllTeacherStudentLinks(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  getStudentsUnderTeacher: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getStudentsUnderTeacher(req.params.teacherId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Groups ─────────────────────────────────────────────────────────────────
  getAllGroups: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        limit: req.query.limit ? Number(req.query.limit) : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      const data = await AdminService.getAllGroups(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  getGroupById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getGroupById(req.params.groupId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  deleteGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.deleteGroup(getAdminId(req), req.params.groupId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Mail Logs ──────────────────────────────────────────────────────────────
  getMailLogById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getMailLogById(req.params.mailId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  getMailLogStats: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      };
      const data = await AdminService.getMailLogStats(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Broadcast ──────────────────────────────────────────────────────────────
  broadcastNotification: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, message, targetRole } = req.body;
      const data = await AdminService.broadcastNotification(
        getAdminId(req), title, message, targetRole
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  getCognitiveAnalytics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getCognitiveAnalytics();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  getEmotionAnalytics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      };
      const data = await AdminService.getEmotionAnalytics(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  getBehaviorAnalytics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      };
      const data = await AdminService.getBehaviorAnalytics(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Teacher Verification ───────────────────────────────────────────────────
  getAllVerificationRequests: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        limit:  req.query.limit  ? Number(req.query.limit)  : 50,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      };
      const data = await AdminService.getAllVerificationRequests(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  reviewVerificationRequest: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { decision, adminNote } = req.body;
      const data = await AdminService.reviewVerificationRequest(
        getAdminId(req),
        req.params.teacherId as string,
        decision,
        adminNote
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};