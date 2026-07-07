import createHttpError from "http-errors";
import { hash } from "bcrypt";
import prisma from "../../config/database";

export const StudentService = {
  /**
   * POST /student/invite/accept
   * Schema: StudentInvite { token, used, expiresAt, email }
   *         User { firstName, lastName, password, isActive }
   */
  async acceptInvite(
    token: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    const invite = await prisma.studentInvite.findFirst({
      where: { token, used: false },
    });

    if (!invite) {
      throw createHttpError(400, "Invalid or expired invite token.");
    }

    if (new Date() > invite.expiresAt) {
      throw createHttpError(
        410,
        "This invite has expired. Ask your teacher to send a new one."
      );
    }

    const hashed = await hash(password, 12);

    const user = await prisma.user.update({
      where: { email: invite.email },
      data: {
        firstName,
        lastName,
        password: hashed,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    await prisma.studentInvite.update({
      where: { id: invite.id },
      data: { used: true },
    });

    return user;
  },

  /**
   * GET /student/me
   * Schema: User + StudentProfile + CognitiveProfile
   */
  async getMyProfile(studentId: string) {
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        gender: true,
        role: true,
        profilePhoto: true,
        homeTown: true,
        currentCity: true,
        isActive: true,
        createdAt: true,
        studentProfile: {
          select: {
            neuroProblemType: true,
            education: true,
            affiliation: true,
            instituteName: true,
            guardianName: true,
            guardianEmail: true,
            guardianPhone: true,
          },
        },
        cognitive: {
          select: {
            attentionScore: true,
            focusDuration: true,
            interactions: true,
            lastUpdated: true,
          },
        },
      },
    });

    if (!user) throw createHttpError(404, "Student not found.");
    return user;
  },

  /**
   * GET /student/groups
   *
   * FIX: Cannot use `include` and `select` together on the same nested
   * relation in Prisma. Changed to a top-level select with nested selects only.
   *
   * Schema: GroupMember { userId, groupId } → Group { teacher, _count.members }
   */
  async getMyGroups(studentId: string) {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: studentId },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => m.group);
  },

  /**
   * GET /student/group/:groupId
   *
   * FIX 1: Prisma unique where uses the @@unique name "compositeId" defined
   *         in schema as @@unique([groupId, userId], name: "compositeId").
   *
   * FIX 2: Group.assignments in schema is the AssignmentGroup[] relation,
   *         named `assignments` on the Group model — this is correct.
   *         But the include on AssignmentGroup needs `assignment` (singular).
   *
   * Schema: GroupMember @@unique([groupId, userId], name: "compositeId")
   *         Group { assignments AssignmentGroup[] }
   *         AssignmentGroup { assignment Assignment }
   */
  async getGroupById(studentId: string, groupId: string) {
    const membership = await prisma.groupMember.findUnique({
      where: {
        compositeId: { groupId, userId: studentId },
      },
    });

    if (!membership) {
      throw createHttpError(403, "Group not found or you are not a member.");
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        members: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
        // Schema: Group.assignments is AssignmentGroup[]
        assignments: {
          select: {
            assignment: {
              select: {
                id: true,
                title: true,
                dueDate: true,
                evaluationMode: true,
              },
            },
          },
        },
      },
    });

    if (!group) throw createHttpError(404, "Group not found.");

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      teacher: group.teacher,
      memberList: group.members.map((m) => m.user),
      assignments: group.assignments.map((ag) => ag.assignment),
    };
  },

  /**
   * GET /student/grades
   * Schema: AssignmentSubmission { grade, feedback, sentiment, sentimentScore }
   *         Assignment { title, dueDate, teacher }
   */
  async getMyGrades(studentId: string) {
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { studentId, grade: { not: null } },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const grades = submissions.map((s) => ({
      submissionId: s.id,
      assignmentId: s.assignment.id,
      assignmentTitle: s.assignment.title,
      dueDate: s.assignment.dueDate,
      teacher: s.assignment.teacher,
      grade: s.grade,
      feedback: s.feedback,
      sentiment: s.sentiment,
      sentimentScore: s.sentimentScore,
      submittedAt: s.createdAt,
      reviewedAt: s.updatedAt,
    }));

    const avg =
      grades.length > 0
        ? Math.round(
            grades.reduce((acc, g) => acc + (g.grade ?? 0), 0) / grades.length
          )
        : null;

    return { grades, averageGrade: avg, totalReviewed: grades.length };
  },

  /**
   * GET /student/notifications
   * Schema: Notification { studentId, title, message, type, isRead, createdAt }
   *         teacher relation → User
   */
  async getMyNotifications(studentId: string) {
    return prisma.notification.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
        teacher: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  },

  /**
   * PATCH /student/notification/:notificationId/read
   * Schema: Notification { id, studentId, isRead }
   */
  async markNotificationRead(studentId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, studentId },
    });

    if (!notification) {
      throw createHttpError(404, "Notification not found.");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  },

  /**
   * GET /student/teacher-feedbacks
   * Schema: TeacherFeedback { studentId, teacherId, feedback, createdAt }
   *         teacher → User { firstName, lastName, profilePhoto }
   */
  async getTeacherFeedbacks(studentId: string) {
    return prisma.teacherFeedback.findMany({
      where: { studentId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};