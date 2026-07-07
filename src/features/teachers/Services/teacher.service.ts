import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { NLPService } from "../../nlp/nlp.service";
import { userRole } from "../../../config/core";

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

type StudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhoto: string | null;
};

type StudentMapEntry = {
  student: StudentSummary;
  groups: { id: string; name: string }[];
};

export const TeacherService = {
  // ─── Validate teacher ─────────────────────────────────────────────────────
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true },
    });
    if (!user) throw createHttpError(404, "User not found");
    if (user.role !== userRole.Teacher)
      throw createHttpError(403, "Access denied. Only teachers are allowed.");
    return user;
  },

  async validateStudent(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    if (!user) throw createHttpError(404, "Student not found");
    if (user.role !== userRole.Student)
      throw createHttpError(403, "Target user is not a student");
    return user;
  },

  // ─── MINDMAP MANAGEMENT PAGE ──────────────────────────────────────────────
  /**
   * Returns 4 KPI cards + enriched mindmap list for the Mindmap Management page:
   *   totalMindmaps, pendingReview, approved, thisWeek
   *   mindmaps[]: each with student name, topics, date, status, comments
   *
   * Optional filter: status = "APPROVED" | "PENDING" | "REJECTED" | undefined (all)
   */
  async getMindmapManagementOverview(
    teacherId: string,
    filter?: { status?: string; search?: string }
  ) {
    await this.validateTeacher(teacherId);

    // Fetch all students linked to this teacher
    const students = await prisma.user.findMany({
      where: {
        role: userRole.Student,
        OR: [
          { createdBy: teacherId },
          { studentTeachers: { some: { teacherId } } },
        ],
      },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Build where clause with optional status / search filters
    const where: any = { userId: { in: studentIds } };
    if (filter?.status) where.approval = filter.status === "APPROVED";
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: "insensitive" } },
        { user: { firstName: { contains: filter.search, mode: "insensitive" } } },
        { user: { lastName: { contains: filter.search, mode: "insensitive" } } },
      ];
    }

    const [allMindmaps, mindmaps] = await Promise.all([
      // All (for KPI counts, unfiltered)
      prisma.mindmap.findMany({
        where: { userId: { in: studentIds } },
        select: { id: true, approval: true, createdAt: true },
      }),
      // Filtered list
      prisma.mindmap.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalMindmaps = allMindmaps.length;
    // approval === null  → pending review
    const pendingReview = allMindmaps.filter((m) => m.approval === null).length;
    const approved = allMindmaps.filter((m) => m.approval === true).length;
    const thisWeek = allMindmaps.filter(
      (m) => new Date(m.createdAt) >= sevenDaysAgo
    ).length;

    const enriched = mindmaps.map((m) => ({
      id: m.id,
      title: m.title,
      student: `${m.user.firstName} ${m.user.lastName}`,
      studentId: m.user.id,
      topics: (m as any).topics ?? [],        // adjust to your schema field
      date: m.createdAt,
      status: m.reviewedById === null ? "Pending" : m.approval === true ? "Approved" : "Rejected",
      comments: (m as any).comments ?? null,
    }));

    await logActivity(
      teacherId,
      "VIEW_MINDMAP_MANAGEMENT_OVERVIEW",
      `total=${totalMindmaps}`
    );

    return {
      totalMindmaps,
      pendingReview,
      approved,
      thisWeek,
      mindmaps: enriched,
    };
  },

  // ─── REVIEW MINDMAP ───────────────────────────────────────────────────────
  async reviewMindmap(
    teacherId: string,
    mindmapId: string,
    approval: boolean,
    comment?: string
  ) {
    await this.validateTeacher(teacherId);

    const mindmap = await prisma.mindmap.findUnique({ where: { id: mindmapId } });
    if (!mindmap) throw createHttpError(404, "Mindmap not found");

    await logActivity(
      teacherId,
      "REVIEW_MINDMAP",
      `mindmapId=${mindmapId}, approval=${approval}`
    );

    return prisma.mindmap.update({
      where: { id: mindmapId },
      data: {
        reviewedById: teacherId,
        approval,
        comments: comment,
      },
    });
  },

  // ─── GET STUDENTS FOR TEACHER ─────────────────────────────────────────────
  async getMyStudents(teacherId: string) {
    await this.validateTeacher(teacherId);

    const relations = await prisma.teacherStudent.findMany({
      where: { teacherId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
          },
        },
      },
    });

    if (!relations.length) return [];

    const studentIds = relations.map((r) => r.studentId);

    // ── Pull groups (belonging to this teacher) that these students are in ──
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: { in: studentIds },
        group: { teacherId }, // only this teacher's groups
      },
      select: {
        userId: true,
        group: { select: { id: true, name: true } },
      },
    });

    // ── Map studentId -> groups[] ──
    const groupsByStudent = new Map<string, { id: string; name: string }[]>();
    for (const m of memberships) {
      if (!groupsByStudent.has(m.userId)) groupsByStudent.set(m.userId, []);
      groupsByStudent.get(m.userId)!.push(m.group);
    }

    // ── Merge: every registered student appears, groups[] is [] if not in any group ──
    return relations.map((r) => ({
      ...r.student,
      groups: groupsByStudent.get(r.studentId) ?? [],
    }));
  },
  
  // ─── STUDENT ANALYTICS ───────────────────────────────────────────────────
  async getStudentAnalytics(
    teacherId: string,
    studentId: string,
    log: boolean = true
  ) {
    await this.validateTeacher(teacherId);
    await this.validateStudent(studentId);

    const [profile, emotions, feedbacks] = await Promise.all([
      prisma.cognitiveProfile.findUnique({ where: { userId: studentId } }),
      prisma.emotionLog.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.feedback.findMany({ where: { userId: studentId }, take: 100 }),
    ]);

    const clamp = (val: number, min: number, max: number) =>
      Math.min(max, Math.max(min, val));

    const weightSum = emotions.reduce((acc, _, i) => acc + 1 / (i + 1), 0);
    const weightedEmotion =
      emotions.length > 0 && weightSum > 0
        ? emotions.reduce(
          (acc, e, i) => acc + (e.intensity ?? 0) * (1 / (i + 1)),
          0
        ) / weightSum
        : 0;

    const avgFeedback =
      feedbacks.length > 0
        ? feedbacks.reduce((acc, f) => acc + (f.rating ?? 0), 0) / feedbacks.length
        : 0;

    const normalizedProfile = profile
      ? {
        ...profile,
        avgFocusPerInteraction:
          profile.interactions && profile.interactions > 0
            ? Math.round((profile.focusDuration ?? 0) / profile.interactions)
            : 0,
      }
      : null;

    if (log) {
      await logActivity(teacherId, "VIEW_STUDENT_ANALYTICS", `studentId=${studentId}`);
    }

    return {
      profile: normalizedProfile,
      avgEmotion: clamp(weightedEmotion, -1, 1),
      avgFeedback,
      emotions,
      feedbacks,
    };
  },

  // ─── SUMMARISE STUDENT PERFORMANCE ───────────────────────────────────────
  async summarizeStudentPerformance(teacherId: string, studentId: string) {
    await this.validateTeacher(teacherId);

    const analytics = await this.getStudentAnalytics(teacherId, studentId, false);

    const summaryText = `
Student Performance Overview:
- Attention Score: ${analytics.profile?.attentionScore ?? "N/A"}
- Average Feedback Rating: ${analytics.avgFeedback.toFixed(2)}
- Emotional Trend Score: ${analytics.avgEmotion.toFixed(2)}
- Avg Focus per Interaction: ${analytics.profile?.avgFocusPerInteraction ?? "N/A"} seconds
- Engagement Interactions: ${analytics.profile?.interactions ?? 0}
    `.trim();

    const safeSummaryText =
      summaryText.length > 2000 ? summaryText.slice(0, 2000) : summaryText;

    const summary = await NLPService.summarize(safeSummaryText);

    if (
      !summary.summary ||
      summary.summary === "No summary generated." ||
      summary.summary.trim().length < 10
    ) {
      summary.summary = `The student demonstrates an attention score of ${analytics.profile?.attentionScore ?? "N/A"
        }, with an average feedback rating of ${analytics.avgFeedback.toFixed(
          2
        )}. Their emotional trend appears stable, and they engage meaningfully with the content.`;
    }

    await logActivity(teacherId, "SUMMARIZE_STUDENT_PERFORMANCE", `studentId=${studentId}`);
    return { summary, data: analytics };
  },

  // ─── CLASS OVERVIEW ───────────────────────────────────────────────────────
  async getClassOverview(teacherId: string) {
    await this.validateTeacher(teacherId);

    const students = await prisma.user.findMany({
      where: {
        role: userRole.Student,
        OR: [
          { createdBy: teacherId },
          { studentTeachers: { some: { teacherId } } },
        ],
      },
    });

    if (!students.length)
      throw createHttpError(404, "No students found for this teacher");

    const studentIds = students.map((s) => s.id);
    const [emotions, feedbacks] = await Promise.all([
      prisma.emotionLog.findMany({ where: { userId: { in: studentIds } } }),
      prisma.feedback.findMany({ where: { userId: { in: studentIds } } }),
    ]);

    const avgFeedback =
      feedbacks.reduce((acc, f) => acc + (f.rating ?? 0), 0) /
      (feedbacks.length || 1);

    const emotionStats = emotions.reduce((acc: Record<string, number>, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {});

    await logActivity(teacherId, "VIEW_CLASS_OVERVIEW", `studentCount=${students.length}`);
    return { classSize: students.length, avgFeedback, emotionStats };
  },
};