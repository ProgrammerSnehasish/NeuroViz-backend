import { Request, Response, NextFunction } from "express";
import * as AdminService from "./admin.service";

export const getOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.getSystemOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
