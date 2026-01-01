import { Request, Response, NextFunction } from "express";
import { userRole } from "../config/core";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    [key: string]: any; // any other user properties
  };
}

export function enforceAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (req.user.role !== userRole.Admin) {
      return res.status(403).json({ success: false, message: "Admins only" });
    }

    // User is authenticated and is an admin
    next();
  } catch (error) {
    console.error("Error in enforceAdmin middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
