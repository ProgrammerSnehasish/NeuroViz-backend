import nodemailer from "nodemailer";
import * as speakeasy from "speakeasy";
import prisma from "../config/database";
import createHttpError from "http-errors";
import { sign, SignOptions } from "jsonwebtoken";
import { userRole } from "../config/core";
import { runAdaptationForUser } from "../features/adapt/adapt.service";
import getUserIncludeByRole from "../utils/getUserDetailsbyRole";
import { Role } from "@prisma/client";

// ── mail helper ────────────────────────────────────────────────────────────

async function sendMail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"NeuroViz" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
}

// ── config ─────────────────────────────────────────────────────────────────
const OTP_STEP = 300;  // 5 minutes
const OTP_DIGITS = 6;

// ── OTP helpers ────────────────────────────────────────────────────────────

function getOtpSecret(userId: string): string {
  return Buffer.from(`${userId}${process.env.JWT_SECRET_KEY}`).toString("base64");
}

function generateOtp(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: "base64",
    digits: OTP_DIGITS,
    step: OTP_STEP,
  });
}

function verifyOtp(secret: string, otp: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base64",
    token: otp,
    digits: OTP_DIGITS,
    step: OTP_STEP,
    window: 1, // allows slight clock drift
  });
}

async function createAndSendOtp(
  userId: string,
  email: string,
  subject: string,
  bodyHtml: string
): Promise<void> {
  const secret = getOtpSecret(userId);
  const otp = generateOtp(secret);

  await prisma.otpCode.updateMany({
    where: { email, used: false },
    data: { used: true },
  });

  await prisma.otpCode.create({
    data: {
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  await sendMail(email, subject, bodyHtml.replace("{{otp}}", otp));
}

async function verifyOtpCode(
  userId: string,
  email: string,
  otp: string
): Promise<void> {
  const record = await prisma.otpCode.findFirst({
    where: {
      email,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw createHttpError(400, "OTP expired or not found. Please request a new one.");
  }

  const secret = getOtpSecret(userId);
  const isValid = verifyOtp(secret, otp) && record.code === otp;  // ✅

  if (!isValid) {
    throw createHttpError(400, "Invalid OTP.");
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { used: true },
  });
}

async function buildLoginResponse(userId: string, role: string): Promise<any> {
  const token = sign(
    { userId, userEmail: "", role },
    process.env.JWT_SECRET_KEY as string,
    { expiresIn: process.env.EXPIRES_IN as SignOptions["expiresIn"] }
  );

  runAdaptationForUser(userId)
    .then((r) => console.log("Adaptation:", r))
    .catch((e) => console.error("Adaptation failed:", e));

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    include: getUserIncludeByRole(role  as Role),
  });

  if (!fullUser) throw createHttpError(404, "User data could not be retrieved");

  const { password, ...sanitizedUser } = fullUser as any;

  // include email in token now that we have the full user
  const finalToken = sign(
    { userId: fullUser.id, userEmail: fullUser.email, role: fullUser.role },
    process.env.JWT_SECRET_KEY as string,
    { expiresIn: process.env.EXPIRES_IN as SignOptions["expiresIn"] }
  );

  if (sanitizedUser.role === userRole.Teacher) {
    delete sanitizedUser.studentProfile;
  } else {
    delete sanitizedUser.teacherProfile;
  }

  return {
    success: true,
    message: "Login successful",
    data: {
      token: finalToken,
      expiry: Date.now() + 60 * 60 * 1000,
      user: sanitizedUser,
    },
  };
}

export { sendMail, createAndSendOtp, verifyOtpCode, getOtpSecret, buildLoginResponse };