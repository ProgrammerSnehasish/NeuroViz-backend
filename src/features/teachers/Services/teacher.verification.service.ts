import createHttpError from "http-errors";
import prisma from "../../../config/database";

async function logActivity(userId: string, action: string, details?: string) {
  try {
    await prisma.activityLog.create({ data: { userId, action, details } });
  } catch (err) {
    console.error("⚠️ Failed to write activity log:", err);
  }
}

export const TeacherVerificationService = {

  // ── Submit for verification ────────────────────────────────────────────────
  async submitForVerification(teacherId: string) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: teacherId },
    });

    if (!profile)
      throw createHttpError(404, "Please complete your profile before submitting.");

    if (profile.isVerified)
      throw createHttpError(400, "Your profile is already verified.");

    // ── Check certifications uploaded ──
    if (!profile.certifications || profile.certifications.length === 0)
      throw createHttpError(400, "Please upload at least one certification before submitting.");

    const existing = await prisma.teacherVerificationRequest.findUnique({
      where: { teacherId },
    });

    if (existing?.status === "PENDING")
      throw createHttpError(409, "You already have a pending verification request.");

    const request = await prisma.teacherVerificationRequest.upsert({
      where:  { teacherId },
      update: {
        status:      "PENDING",
        submittedAt: new Date(),
        adminNote:   null,
        reviewedAt:  null,
        reviewedBy:  null,
      },
      create: { teacherId },
    });

    await logActivity(
      teacherId,
      "SUBMIT_VERIFICATION_REQUEST",
      `teacherId=${teacherId}`
    );

    return {
      message: "Verification request submitted. Pending admin review.",
      request,
    };
  },

  // ── Get own verification status ────────────────────────────────────────────
  async getVerificationStatus(teacherId: string) {
    const [profile, request] = await Promise.all([
      prisma.teacherProfile.findUnique({
        where:  { userId: teacherId },
        select: {
          isVerified:   true,
          isPublished:  true,
          certifications: true,
        },
      }),
      prisma.teacherVerificationRequest.findUnique({
        where: { teacherId },
        select: {
          status:      true,
          adminNote:   true,
          submittedAt: true,
          reviewedAt:  true,
          reviewer: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    if (!profile)
      throw createHttpError(404, "Teacher profile not found.");

    return {
      isVerified:         profile.isVerified,
      isPublished:        profile.isPublished,
      certificationsCount: profile.certifications?.length ?? 0,
      verificationRequest: request ?? null,
    };
  },
};