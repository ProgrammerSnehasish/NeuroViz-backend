import { Request, Response, NextFunction } from "express";
import { AdminService } from "./admin.service";
import prisma from "../../config/database";

const getAdminId = (req: Request): string => {
  return (
    (req.user as any)?.id ||
    (req.user as any)?.userId ||
    (req.user as any)?._id
  );
};

export const AdminController = {
  overview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getAdminId(req);
      await AdminService.validateAdmin(id);
      await prisma.activityLog.create({
      data: {
        userId: id,
        action: "ADMIN_DASHBOARD_VIEW",
        details: `Admin ${id} opened system overview dashboard.`
      }
    });
      const data = await AdminService.getSystemOverview();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  health: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getAdminId(req);
      await AdminService.validateAdmin(id);
      await prisma.activityLog.create({
        data: {
          userId: id,
          action: "ADMIN_HEALTH_VIEW",
          details: `Admin ${id} checked system health.`,
        },
      });
      const data = await AdminService.getSystemHealth();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  activityLogs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getAdminId(req);
      await AdminService.validateAdmin(id);
      await prisma.activityLog.create({
        data: {
          userId: id,
          action: "ADMIN_ACTIVITY_LOGS_VIEW",
          details: `Admin ${id} viewed activity logs.`,
        },
      });
      const data = await AdminService.getActivityLogs();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  getUsers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getAdminId(req);
      await AdminService.validateAdmin(id);
      await prisma.activityLog.create({
        data: {
          userId: id,
          action: "ADMIN_VIEW_USERS",
          details: `Admin ${id} viewed all users.`,
        },
      });
      const data = await AdminService.getAllUsers();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  updateStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getAdminId(req);
      await AdminService.validateAdmin(id);
      const { userId, isActive } = req.body;
      const data = await AdminService.updateUserStatus(userId, isActive);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  deleteUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getAdminId(req);
      await AdminService.validateAdmin(id);
      const { userId } = req.params;
      const data = await AdminService.deleteUser(userId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  resetUserData: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getAdminId(req);
      await AdminService.validateAdmin(id);
      const { userId } = req.params;
      const data = await AdminService.resetUserData(userId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
};
