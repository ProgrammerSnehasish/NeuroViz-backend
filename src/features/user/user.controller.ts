import { Request, Response, NextFunction } from "express";
import { UserService as UserServiceClass } from "./user.service";

const UserService = new UserServiceClass();

const getUserId = (req: Request): string =>
  (req as any).user?.userId ||
  (req as any).user?.id ||
  (req as any).user?.sub;

export const UserController = {

  /** GET /user/email/:email */
  getUserByEmail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.params;
      if (!email) throw { status: 400, message: "Missing path parameter: email" };

      const data = await UserService.getUser(email as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /user/:id */
  getUserById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) throw { status: 400, message: "Missing path parameter: id" };

      const data = await UserService.getUserById(id as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PUT /user/update */
  updateUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) throw { status: 401, message: "Unauthorized - Missing user ID in token" };

      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const photoBuffer = files?.["profilePhoto"]?.[0]?.buffer;
      const certificationFiles = files?.["certifications"] ?? [];

      const data = await UserService.updateUser(
        req.body,
        userId,
        photoBuffer,
        certificationFiles,
      );

      res.json({ success: true, message: "User updated successfully", data });
    } catch (err) { next(err); }
  },

  /** DELETE /user/delete/:userId */
  deleteUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      if (!userId) throw { status: 400, message: "Missing path parameter: userId" };

      await UserService.deleteUser(userId as string);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (err) { next(err); }
  },
};