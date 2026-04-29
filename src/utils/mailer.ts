import nodemailer from "nodemailer";
import prisma from "../config/database";

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // e.g., smtp.gmail.com
  port: Number(process.env.MAIL_PORT), // 587
  secure: false, // true for port 465
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendMail = async ({
  to,
  subject,
  html,
  text,
  teacherId,
  studentId,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  teacherId: string;   // sender (Teacher)
  studentId?: string | null;  // recipient (Student, optional if not created yet)
}) => {
  const body = html || text || "";

  try {
    // Send the email
    await transporter.sendMail({
      from: `"NeuroViz" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });

    // Log mail as SENT
    await prisma.mailLog.create({
      data: {
        senderId: teacherId,        // Always the teacher
        recipientId: studentId ?? null, // Student if known
        to,
        subject,
        body,
        status: "SENT",
      },
    });

    return { success: true, message: "Mail sent successfully" };
  } catch (error: any) {
    // Log mail as FAILED
    await prisma.mailLog.create({
      data: {
        senderId: teacherId,
        recipientId: studentId ?? null,
        to,
        subject,
        body,
        status: "FAILED",
        error: error.message || "Unknown error",
      },
    });

    console.error("Email send failed:", error);
    return { success: false, error: error.message };
  }
};
