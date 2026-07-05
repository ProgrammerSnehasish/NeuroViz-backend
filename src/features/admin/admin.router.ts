import { Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { AdminController } from "./admin.controller";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { enforceAdmin } from "../../middlewares/enforceAdmin";
import {
  UpdateUserStatusDto,
  UpdateFeedbackStatusDto,
  BroadcastNotificationDto,
  ReviewVerificationDto,
} from "./admin.dto";

const adminRouter = Router();

// Apply auth + admin check to all routes
adminRouter.use(verifyToken, enforceAdmin);

// ── Dashboard ─────────────────────────────────────────────────────────────────
adminRouter.get("/overview", AdminController.overview);
adminRouter.get("/health", AdminController.health);
adminRouter.get("/activity/logs", AdminController.activityLogs);

// ── User Management ───────────────────────────────────────────────────────────
adminRouter.get("/users", AdminController.getUsers);
adminRouter.get("/user/:userId", AdminController.getUserById);
adminRouter.patch("/user/status", dtoValidation(UpdateUserStatusDto), AdminController.updateStatus);
adminRouter.delete("/user/:userId", AdminController.deleteUser);
adminRouter.delete("/user/:userId/reset", AdminController.resetUserData);

// ── Site Feedback ─────────────────────────────────────────────────────────────
adminRouter.get("/feedback", AdminController.getAllFeedbacks);
adminRouter.get("/feedback/stats", AdminController.getFeedbackStats);
adminRouter.get("/feedback/:feedbackId", AdminController.getFeedbackById);
adminRouter.patch("/feedback/:feedbackId/status", dtoValidation(UpdateFeedbackStatusDto), AdminController.updateFeedbackStatus);
adminRouter.delete("/feedback/:feedbackId", AdminController.deleteFeedback);

// ── Mail Logs ─────────────────────────────────────────────────────────────────
adminRouter.get("/mail/logs", AdminController.getMailStats);
adminRouter.get("/mail/log/:mailId", AdminController.getMailLogById);
adminRouter.get("/mail/stats", AdminController.getMailLogStats);

// ── Newsletter ────────────────────────────────────────────────────────────────
adminRouter.get("/newsletter/stats", AdminController.getNewsletterStats);

// ── Teacher-Student ───────────────────────────────────────────────────────────
adminRouter.get("/teacher-students", AdminController.getAllTeacherStudentLinks);
adminRouter.get("/teacher/:teacherId/students", AdminController.getStudentsUnderTeacher);

// ── Groups ────────────────────────────────────────────────────────────────────
adminRouter.get("/groups", AdminController.getAllGroups);
adminRouter.get("/group/:groupId", AdminController.getGroupById);
adminRouter.delete("/group/:groupId", AdminController.deleteGroup);

// ── Notifications ─────────────────────────────────────────────────────────────
adminRouter.post("/notification/broadcast", dtoValidation(BroadcastNotificationDto), AdminController.broadcastNotification);

// ── Analytics ─────────────────────────────────────────────────────────────────
adminRouter.get("/analytics/cognitive", AdminController.getCognitiveAnalytics);
adminRouter.get("/analytics/emotions", AdminController.getEmotionAnalytics);
adminRouter.get("/analytics/behavior", AdminController.getBehaviorAnalytics);

// ── Teacher Verification ──────────────────────────────────────────────────────
adminRouter.get("/verification/requests", AdminController.getAllVerificationRequests);
adminRouter.patch("/verification/:teacherId/review", dtoValidation(ReviewVerificationDto), AdminController.reviewVerificationRequest);

export default adminRouter;