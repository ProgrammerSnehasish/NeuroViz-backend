import { NextFunction, Request, Response, Router } from "express";
import { dtoValidation } from "../middlewares/dtoValidation";
import { AuthController } from "./auth.controller";
import { ForgotPasswordRequestDto, ForgotPasswordVerifyOtpDto, GoogleAuthDto, OtpLoginRequestDto, OtpLoginVerifyDto, ResetPasswordDto, SigninDto, SignupDto } from "./auth.dto";
import { requireAuth } from "../middlewares/requireAuth";

const authRouter=Router()
const authController: AuthController = new AuthController();

// ── Primary Login ──────────────────────────────────────────────────────────────
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

// ── Signup ──────────────────────────────────────────────────────────────
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

// ── OTP Login ──────────────────────────────────────────────────────────────
// Step 1: POST /auth/otp/request  { email, role }
authRouter.post("/otp/request", dtoValidation(OtpLoginRequestDto), async (req, res, next) => {
  try { req.body = await authController.requestLoginOtp(req.body); next(); }
  catch (err) { next(err); }
});

// Step 2: POST /auth/otp/verify   { email, otp }
authRouter.post("/otp/verify", dtoValidation(OtpLoginVerifyDto), async (req, res, next) => {
  try { req.body = await authController.verifyLoginOtp(req.body); next(); }
  catch (err) { next(err); }
});

// ── Reset Password ─────────────────────────────────────────────────────────
// Step 1: POST /auth/password/forgot        { email }
authRouter.post("/password/forgot", dtoValidation(ForgotPasswordRequestDto), async (req, res, next) => {
  try { req.body = await authController.requestPasswordReset(req.body); next(); }
  catch (err) { next(err); }
});

// Step 2: POST /auth/password/verify-otp   { email, otp }  ← optional pre-check
authRouter.post("/password/verify-otp", dtoValidation(ForgotPasswordVerifyOtpDto), async (req, res, next) => {
  try { req.body = await authController.verifyPasswordResetOtp(req.body); next(); }
  catch (err) { next(err); }
});

// Step 3: POST /auth/password/reset        { email, otp, newPassword }
authRouter.post("/password/reset", dtoValidation(ResetPasswordDto), async (req, res, next) => {
  try { req.body = await authController.resetPassword(req.body); next(); }
  catch (err) { next(err); }
});

// POST /auth/google  { idToken, role }
authRouter.post("/google", dtoValidation(GoogleAuthDto), async (req, res, next) => {
  try { req.body = await authController.googleAuth(req.body); next(); }
  catch (err) { next(err); }
});

authRouter.post("/signout", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // token and userId are attached by requireAuth middleware
    const token = req.headers.authorization?.split(" ")[1] as string;
    const userId = (req as any).user.userId;
    req.body = await authController.signout(token, userId);
    next();
  } catch (err) {
    next(err);
  }
});

export default authRouter;