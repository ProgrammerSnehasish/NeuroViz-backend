import { NextFunction, Request, Response, Router } from "express";
import { dtoValidation } from "../middlewares/dtoValidation";
import { AuthController } from "./auth.controller";
import { SigninDto, SignupDto } from "./auth.dto";

const authRouter=Router()
const authController: AuthController = new AuthController();

authRouter.post(
    "/signin",
    dtoValidation(SigninDto), 
    async  (req:Request, res: Response, next: NextFunction)=>{
        try {
            const result = await authController.signin(req.body);
            req.body = result
            next()
        } catch (err) {
            next(err)
        }
    }
);

authRouter.post(
    "/signup",
    dtoValidation(SignupDto),
    async (req:Request,res:Response, next: NextFunction)=>{
        try{
            const result = await authController.signup(req.body)
            req.body = result
            next()
        } catch(err) {
            next(err)
        }
    }
);
export default authRouter;