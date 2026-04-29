import { compare, hash } from "bcrypt";
import createHttpError from "http-errors";
import { sign, SignOptions } from "jsonwebtoken";
import { IUserDetails } from "../features/user/user.interface";
import { getUserResponse } from "../utils/util";
import { ForgotPasswordRequestDto, ForgotPasswordVerifyOtpDto, GoogleAuthDto, OtpLoginRequestDto, OtpLoginVerifyDto, ResetPasswordDto, SigninDto, SignupDto } from "./auth.dto";
import prisma from "../config/database";
import { runAdaptationForUser } from "../features/adapt/adapt.service";
import getUserIncludeByRole from "../utils/getUserDetailsbyRole";
import { userRole } from "../config/core";
import { createAndSendOtp, getOtpSecret, verifyOtpCode } from "./auth.helper";
import * as speakeasy from "speakeasy";
import { OAuth2Client } from "google-auth-library";
import { buildLoginResponse } from "./auth.helper";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  public constructor() { }

// Email and Password based signin.
  public async signin(data: SigninDto): Promise<any> {
    const foundUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!foundUser) {
      await prisma.activityLog.create({
        data: {
          userId: "System",
          action: "SIGNIN_FAILED",
          details: `Login failed: User not found for email ${data.email}`,
        },
      });

      throw createHttpError(400, `User with email ${data.email} does not exist`);
    }

    const passwordMatch = await compare(data.password, foundUser.password);
    if (!passwordMatch) {

      await prisma.activityLog.create({
        data: {
          userId: foundUser.id,
          action: "PASSWORD_MISMATCH",
          details: `Incorrect password attempt for ${foundUser.email}`,
        },
      });

      throw createHttpError(400, "Invalid password");
    }

    if (data.role && data.role !== foundUser.role) {

      await prisma.activityLog.create({
        data: {
          userId: foundUser.id,
          action: "WRONG_ROLE_LOGIN_ATTEMPT",
          details: `Attempted login as ${data.role}, actual role is ${foundUser.role}`,
        },
      });

      throw createHttpError(
        403,
        `This account is registered as a ${foundUser.role}, not as ${data.role}`
      );
    }

    const token = sign(
      {
        userId: foundUser.id,
        userEmail: foundUser.email,
        role: foundUser.role,
      },
      process.env.JWT_SECRET_KEY as string,
      {expiresIn: process.env.EXPIRES_IN as SignOptions["expiresIn"]}
    );

    runAdaptationForUser(foundUser.id)
      .then((result) => console.log("Adaptation run on login:", result))
      .catch((err) => console.error("Adaptation failed:", err));

    const fullUserDetails = await prisma.user.findUnique({
      where: { id: foundUser.id },
      include: getUserIncludeByRole(foundUser.role),
    });

    if (!fullUserDetails) {
      throw createHttpError(404, "User data could not be retrieved after login");
    }

    const { password, ...sanitizedUser } = fullUserDetails as any;

    if (sanitizedUser.role === userRole.Teacher) {
      delete sanitizedUser.studentProfile;
    } else {
      delete sanitizedUser.teacherProfile;
    }

    // Log successful login
    await prisma.activityLog.create({
      data: {
        userId: foundUser.id,
        action: "SIGNIN_SUCCESS",
        details: `User logged in successfully`,
      },
    });

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        expiry: Date.now() + 60 * 60 * 1000,
        user: sanitizedUser,
      },
    };
  }

// OTP based login
public async requestLoginOtp(data: OtpLoginRequestDto): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    throw createHttpError(404, `No account found for ${data.email}`);
  }

  if (user.role !== data.role) {
    throw createHttpError(
      403,
      `This account is registered as a ${user.role}, not as ${data.role}`
    );
  }

  await createAndSendOtp(
    user.id,
    user.email,
    "Your NeuroViz Login OTP",
    `
      <p>Hello <strong>${user.firstName}</strong>,</p>
      <p>Your one-time login code is:</p>
      <h2 style="letter-spacing:4px;">{{otp}}</h2>
      <p>This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
    `
  );

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "OTP_LOGIN_REQUESTED",
      details: `OTP login code sent to ${user.email}`,
    },
  });

  return { message: "OTP sent to your email. Valid for 5 minutes." };
}

public async verifyLoginOtp(data: OtpLoginVerifyDto): Promise<any> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    throw createHttpError(404, `No account found for ${data.email}`);
  }

  await verifyOtpCode(user.id, user.email, data.otp);

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "SIGNIN_SUCCESS",
      details: `User logged in via OTP`,
    },
  });

  // Reuse the same login response builder as regular signin
  const token = sign(
    { userId: user.id, userEmail: user.email, role: user.role },
    process.env.JWT_SECRET_KEY as string,
    { expiresIn: process.env.EXPIRES_IN as SignOptions["expiresIn"] }
  );

  runAdaptationForUser(user.id)
    .then((r) => console.log("Adaptation:", r))
    .catch((e) => console.error("Adaptation failed:", e));

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: getUserIncludeByRole(user.role),
  });

  if (!fullUser) throw createHttpError(404, "User data could not be retrieved");

  const { password, ...sanitizedUser } = fullUser as any;

  if (sanitizedUser.role === userRole.Teacher) {
    delete sanitizedUser.studentProfile;
  } else {
    delete sanitizedUser.teacherProfile;
  }

  return {
    success: true,
    message: "Login successful",
    data: {
      token,
      expiry: Date.now() + 60 * 60 * 1000,
      user: sanitizedUser,
    },
  };
}

// Reset Password
public async requestPasswordReset(
  data: ForgotPasswordRequestDto
): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  // Always return the same message — don't leak whether email exists
  if (!user) {
    return { message: "If this email is registered, an OTP has been sent." };
  }

  await createAndSendOtp(
    user.id,
    user.email,
    "Reset Your NeuroViz Password",
    `
      <p>Hello <strong>${user.firstName}</strong>,</p>
      <p>You requested a password reset. Your OTP is:</p>
      <h2 style="letter-spacing:4px;">{{otp}}</h2>
      <p>This code expires in <strong>5 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    `
  );

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      details: `Password reset OTP sent to ${user.email}`,
    },
  });

  return { message: "If this email is registered, an OTP has been sent." };
}

// Optional separate step: just verify OTP is valid before showing password form
public async verifyPasswordResetOtp(
  data: ForgotPasswordVerifyOtpDto
): Promise<{ message: string; verified: boolean }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    throw createHttpError(404, "No account found for this email");
  }

  const record = await prisma.otpCode.findFirst({
    where: {
      email: data.email,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw createHttpError(400, "OTP expired or not found. Please request a new one.");
  }

  const secret = getOtpSecret(user.id);
  const isValid =
    speakeasy.totp.verify({        
      secret,
      encoding: "base64",           
      token: data.otp,
      step: 300,                    
      window: 1,
    }) && record.code === data.otp;

  if (!isValid) {
    throw createHttpError(400, "Invalid OTP.");
  }

  return { message: "OTP verified. You may now reset your password.", verified: true };
}
public async resetPassword(data: ResetPasswordDto): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    throw createHttpError(404, "No account found for this email");
  }

  // Re-verify OTP on final step — marks it as used
  await verifyOtpCode(user.id, user.email, data.otp);

  const hashedPassword = await hash(data.newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "PASSWORD_RESET_SUCCESS",
      details: `Password successfully reset for ${user.email}`,
    },
  });

  return { message: "Password reset successful. You can now log in." };
}

// Email and Password based Signup.
  public async signup(data: SignupDto): Promise<IUserDetails> {
    const foundUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (foundUser) {
      await prisma.activityLog.create({
        data: {
          userId: foundUser?.id || "System",
          action: "SIGNUP_FAILED",
          details: `Signup failed: Email ${data.email} already registered`,
        },
      });
      throw createHttpError(400, "User with email " + data.email + " already exists");
    }

    const hashedPassword = await hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        role: data.role,
        password: hashedPassword,
        preferences: {}
      },
    });

    await prisma.activityLog.create({
        data: {
          userId: newUser?.id || "SYSTEM",
          action: "SIGNUP_SUCCESS",
          details: `User signed up successfully with email ${data.email}`,
        },
    });

    return getUserResponse(newUser);
  }

  // Google OAuth based signin / signup
  public async googleAuth(data: GoogleAuthDto): Promise<any> {

    // 1. Verify the ID token with Google
    const ticket = await googleClient
      .verifyIdToken({
        idToken: data.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      .catch(() => {
        throw createHttpError(401, "Invalid Google token. Please try again.");
      });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      throw createHttpError(401, "Google token did not return an email.");
    }

    const {
      email,
      given_name,
      family_name,
      sub: googleId,
    } = payload;

    // 2. Check if user already exists by email
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Existing user — enforce role consistency
      if (user.role !== data.role) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "WRONG_ROLE_LOGIN_ATTEMPT",
            details: `Google OAuth: attempted as ${data.role}, actual role is ${user.role}`,
          },
        });

        throw createHttpError(
          403,
          `This account is registered as a ${user.role}, not as ${data.role}`
        );
      }

      // Link googleId if this is their first Google login
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "SIGNIN_SUCCESS",
          details: `User signed in via Google OAuth`,
        },
      });

    } else {
      // New user — auto register with Google data
      user = await prisma.user.create({
        data: {
          email,
          firstName: given_name ?? "",
          lastName: family_name ?? "",
          googleId,
          role: data.role,
          password: "",       // no password for OAuth-only users
          preferences: {},
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "SIGNUP_SUCCESS",
          details: `New user registered via Google OAuth`,
        },
      });
    }

    return buildLoginResponse(user.id, user.role);
  }

  public async signout(token: string, userId: string): Promise<{ message: string }> {
  
  // Decode to get expiry — no need to re-verify, middleware already did that
  const decoded = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString()
  );

  const expiresAt = new Date(decoded.exp * 1000);

  // Blacklist the token until it naturally expires
  await prisma.blacklistedToken.create({
    data: {
      token,
      expiresAt,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: "SIGNOUT_SUCCESS",
      details: `User logged out successfully`,
    },
  });

  return { message: "Logged out successfully." };
  }
}
