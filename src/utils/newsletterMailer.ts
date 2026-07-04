import nodemailer from "nodemailer";
import prisma from "../config/database";

export const sendNewsletterMail = async ({
  to,
  subject,
  html,
  newsletterId,
  sentBy,
}: {
  to: string;
  subject: string;
  html: string;
  newsletterId?: string | null;
  sentBy?: string | null;   // adminId or null for system mails (subscribe/unsubscribe)
}) => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"NeuroViz Newsletter" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });

    await prisma.mailLog.create({
      data: {
        senderId: sentBy || null,
        recipientId: null,         // newsletter recipients aren't necessarily users
        to,
        subject,
        body: html,
        status: "SENT",
      },
    });

    return { success: true };
  } catch (error: any) {
    await prisma.mailLog.create({
      data: {
        senderId: sentBy || null,
        recipientId: null,
        to,
        subject,
        body: html,
        status: "FAILED",
        error: error.message ?? "Unknown error",
      },
    });

    console.error(`Newsletter mail failed for ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};