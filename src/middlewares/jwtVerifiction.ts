import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { verify, JwtPayload } from "jsonwebtoken";

interface DecodedUser extends JwtPayload {
  userId: string;
  userEmail: string;
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(createHttpError(401, "Invalid or missing token"));
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verify(token, process.env.JWT_SECRET_KEY as string) as DecodedUser;

    // ✅ Attach decoded user info to request (so controllers can access it)
    (req as any).user = {
      id: decoded.userId,
      email: decoded.userEmail,
    };

    next();
  } catch (error) {
    next(createHttpError(401, "Invalid or expired token"));
  }
}
