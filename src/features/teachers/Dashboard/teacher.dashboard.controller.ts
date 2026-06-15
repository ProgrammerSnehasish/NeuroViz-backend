import { Request, Response, NextFunction } from "express";
import { TeacherDashboardService } from "./teacher.dashboard.service";
import { BroadcastAnnouncementDto } from "../teacher.dto";

const getTeacherId = (req: Request): string => {
  return (
    (req.user as any)?.id ||
    (req.user as any)?.userId ||
    (req.user as any)?._id
  );
};

export const TeacherDashboardController = {
  // Dashboard Overview
  getDashboardOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.getDashboardOverview(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Class Emotion + Cognitive Heatmap
  getClassHeatmap: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.getClassHeatmap(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getAnalyticsOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.getAnalyticsOverview(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Student Progress Report
  getStudentProgress: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const { studentId } = req.params;
      const data = await TeacherDashboardService.getStudentProgress(teacherId, studentId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Student Detailed AI Report
  getStudentReport: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const { studentId } = req.params;
      const data = await TeacherDashboardService.getStudentReport(teacherId, studentId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Individual Student AI Strategy
  getStudentStrategy: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const { studentId } = req.params;
      const data = await TeacherDashboardService.getStudentStrategy(teacherId, studentId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Class-Level Strategy
  getClassStrategy: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.getClassStrategy(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Compare Students
  compareStudents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.compareStudents(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Adaptive Teaching Insights (AI)
  getAdaptiveTeachingInsights: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.getAdaptiveTeachingInsights(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Assignment Insights (AI)
  getAssignmentInsights: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.getAssignmentInsights(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Teacher Feedback Management
  giveFeedback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const { studentId, feedback } = req.body;
      const data = await TeacherDashboardService.giveFeedback(teacherId, studentId, feedback);
      res.json({ success: true, message: "Feedback submitted", data });
    } catch (err) {
      next(err);
    }
  },

  getFeedbackOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.getFeedbackOverview(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Notification Center
  getNotifications: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.getNotifications(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  markNotificationRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await TeacherDashboardService.markRead(id as string);
      res.json({ success: true, message: "Notification marked as read", data });
    } catch (err) {
      next(err);
    }
  },

  postNotification: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const { title, message } = req.body;
      const data = await TeacherDashboardService.postNotification(teacherId, title, message);
      res.json({ success: true, message: "Notification posted successfully", data });
    } catch (err) {
      next(err);
    }
  },

  markAllNotificationsRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.markAllRead(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  broadcastAnnouncement: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, message } = BroadcastAnnouncementDto.parse(req.body);
      const teacherId = getTeacherId(req);
      const data = await TeacherDashboardService.broadcastAnnouncement(teacherId, title, message);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
