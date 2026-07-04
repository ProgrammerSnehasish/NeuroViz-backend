import createHttpError from "http-errors";
import prisma from "../../config/database";
import { sendMail } from "../../utils/mailer";
import { NewsletterStatus } from "@prisma/client";
import { generateUnsubscribeToken, verifyUnsubscribeToken } from "../../utils/HMACtoken";
import sanitizeHtml from "sanitize-html";

type CreateNewsletterInput = { title: string; content: string };
type UpdateNewsletterInput = { title?: string; content?: string };
type SendNewsletterInput = { emails?: string[] };

const safeNewsletterSelect = {
  id: true,
  title: true,
  content: true,
  status: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
  sender: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

const sanitizeConfig: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "img"]),
  allowedAttributes: { "*": ["style", "class"], a: ["href"], img: ["src"] },
};

async function logActivity(
  userId: string | null | undefined,
  action: string,
  details?: string
) {
  if (!userId) return;
  try {
    await prisma.activityLog.create({ data: { userId, action, details } });
  } catch (err) {
    console.error("⚠️ Failed to write activity log:", err);
  }
}

export const NewsletterService = {

  // ── ADMIN: Create newsletter (draft) ──────────────────────────────────────
  async createNewsletter(adminId: string, data: CreateNewsletterInput) {
    const sanitizedContent = sanitizeHtml(data.content, sanitizeConfig);

    const newsletter = await prisma.newsletter.create({
      data: {
        title: data.title,
        content: sanitizedContent,
        sentBy: adminId,
      },
      select: safeNewsletterSelect,
    });

    await logActivity(adminId, "CREATE_NEWSLETTER", `newsletterId=${newsletter.id}`);
    return newsletter;
  },

  // ── ADMIN: Get all newsletters ─────────────────────────────────────────────
  async getAllNewsletters() {
    return prisma.newsletter.findMany({
      select: safeNewsletterSelect,
      orderBy: { createdAt: "desc" },
    });
  },

  // ── ADMIN: Get single newsletter ───────────────────────────────────────────
  async getNewsletterById(newsletterId: string) {
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId },
      select: safeNewsletterSelect,
    });

    if (!newsletter) throw createHttpError(404, "Newsletter not found.");
    return newsletter;
  },

  // ── ADMIN: Update newsletter (only if DRAFT) ───────────────────────────────
  async updateNewsletter(adminId: string, newsletterId: string, data: UpdateNewsletterInput) {
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId },
    });

    if (!newsletter) throw createHttpError(404, "Newsletter not found.");
    if (newsletter.status !== "DRAFT")
      throw createHttpError(400, "Only draft newsletters can be updated.");

    const updated = await prisma.newsletter.update({
      where: { id: newsletterId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: sanitizeHtml(data.content, sanitizeConfig) }),
      },
      select: safeNewsletterSelect,
    });

    await logActivity(adminId, "UPDATE_NEWSLETTER", `newsletterId=${newsletterId}`);
    return updated;
  },

  // ── ADMIN: Delete newsletter (only if DRAFT) ───────────────────────────────
  async deleteNewsletter(adminId: string, newsletterId: string) {
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId },
    });

    if (!newsletter) throw createHttpError(404, "Newsletter not found.");
    if (newsletter.status !== "DRAFT")
      throw createHttpError(400, "Only draft newsletters can be deleted.");

    await prisma.newsletter.delete({ where: { id: newsletterId } });
    await logActivity(adminId, "DELETE_NEWSLETTER", `newsletterId=${newsletterId}`);

    return { message: "Newsletter deleted successfully." };
  },

  // ── ADMIN: Send newsletter ─────────────────────────────────────────────────
  async sendNewsletter(adminId: string, newsletterId: string, data: SendNewsletterInput) {
    const newsletter = await prisma.newsletter.findUnique({
      where: { id: newsletterId },
    });

    if (!newsletter) throw createHttpError(404, "Newsletter not found.");
    if (newsletter.status === NewsletterStatus.SENT)
      throw createHttpError(400, "This newsletter has already been sent.");

    // ── Resolve recipients ─────────────────────────────────────────────────
    let recipients: string[] = [];

    if (data.emails && data.emails.length > 0) {
      recipients = data.emails;
    } else {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: { isSubscribed: true },
        select: { email: true },
      });
      recipients = subscribers.map((s) => s.email);
    }

    if (recipients.length === 0)
      throw createHttpError(400, "No recipients found to send the newsletter.");

    // ── Send to each recipient ─────────────────────────────────────────────
    let sentCount = 0;
    let failedCount = 0;

    await Promise.all(
      recipients.map(async (email) => {
        const unsubToken = generateUnsubscribeToken(email);
        try {
          await sendMail({
            to: email,
            subject: newsletter.title,
            html: `
              <h2>${newsletter.title}</h2>
              <div>${newsletter.content}</div>
              <br/>
              <hr/>
              <p style="font-size:12px; color:gray;">
                You are receiving this because you subscribed to NeuroViz newsletters.
                <br/>
                <a href="${process.env.CLIENT_URL}/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken}">
                  Unsubscribe
                </a>
              </p>
            `,
            teacherId: adminId,
          });

          await prisma.newsletterLog.create({
            data: { newsletterId, email, status: NewsletterStatus.SENT },
          });

          sentCount++;
        } catch (error: any) {
          await prisma.newsletterLog.create({
            data: {
              newsletterId,
              email,
              status: NewsletterStatus.FAILED,
              error: error.message ?? "Unknown error",
            },
          });

          failedCount++;
        }
      })
    );

    // ── Mark as SENT or FAILED based on results ────────────────────────────
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: {
        status: sentCount > 0 ? NewsletterStatus.SENT : NewsletterStatus.FAILED,
        sentAt: new Date(),
      },
    });

    await logActivity(
      adminId,
      "SEND_NEWSLETTER",
      `newsletterId=${newsletterId}, sent=${sentCount}, failed=${failedCount}`
    );

    return {
      message: "Newsletter sent.",
      sentCount,
      failedCount,
      total: recipients.length,
    };
  },

  // ── ADMIN: Get newsletter logs ─────────────────────────────────────────────
  async getNewsletterLogs(newsletterId: string) {
    const logs = await prisma.newsletterLog.findMany({
      where: { newsletterId },
      orderBy: { sentAt: "desc" },
    });

    if (logs.length === 0) {
      const exists = await prisma.newsletter.findUnique({
        where: { id: newsletterId },
      });
      if (!exists) throw createHttpError(404, "Newsletter not found.");
    }

    return logs;
  },

  // ── PUBLIC: Subscribe ──────────────────────────────────────────────────────
  async subscribe(email: string, name?: string) {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      // ── Generic message to prevent email enumeration ──
      if (existing.isSubscribed)
        return { message: "If this email is valid, you will receive a confirmation shortly." };

      // ── Re-subscribe ──
      const updated = await prisma.newsletterSubscriber.update({
        where: { email },
        data: { isSubscribed: true, unsubscribedAt: null, name: name ?? existing.name },
      });
      return { message: "Re-subscribed successfully.", subscriber: updated };
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: { email, name },
    });

    const unsubToken = generateUnsubscribeToken(email);

    await sendMail({
      to: email,
      subject: "You're subscribed to NeuroViz Newsletter!",
      html: `
        <h2>Welcome${name ? `, ${name}` : ""}!</h2>
        <p>You have successfully subscribed to the NeuroViz newsletter.</p>
        <p>You'll receive updates, tips, and announcements directly in your inbox.</p>
        <br/>
        <p style="font-size:12px; color:gray;">
          To unsubscribe at any time, visit:
          <a href="${process.env.CLIENT_URL}/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken}">
            Unsubscribe
          </a>
        </p>
      `,
      teacherId: ""
    });

    return { message: "Subscribed successfully.", subscriber };
  },

  // ── PUBLIC: Unsubscribe ────────────────────────────────────────────────────
  async unsubscribe(email: string, token?: string) {
    if (token && !verifyUnsubscribeToken(email, token))
      throw createHttpError(403, "Invalid or tampered unsubscribe link.");

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (!existing || !existing.isSubscribed)
      throw createHttpError(404, "This email is not subscribed.");

    const updated = await prisma.newsletterSubscriber.update({
      where: { email },
      data: { isSubscribed: false, unsubscribedAt: new Date() },
    });

    return { message: "Unsubscribed successfully.", subscriber: updated };
  },

  // ── ADMIN: Get all subscribers ─────────────────────────────────────────────
  async getAllSubscribers(onlyActive?: boolean) {
    return prisma.newsletterSubscriber.findMany({
      where: onlyActive ? { isSubscribed: true } : undefined,
      orderBy: { subscribedAt: "desc" },
    });
  },
};