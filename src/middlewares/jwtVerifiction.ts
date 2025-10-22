import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { verify } from "jsonwebtoken";

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
    if (!(req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer')) {
        next(createHttpError(401, "Invalid Token"))
        return
    } 
    const token = req.headers.authorization.split(' ')[1]
    try {
        const decoded = verify(token, process.env.JWT_SECRET_KEY as string);
        req.body.token = decoded;
        next();
    } catch (error) {
        next(createHttpError(401, "Invalid Token"))
    }
}
