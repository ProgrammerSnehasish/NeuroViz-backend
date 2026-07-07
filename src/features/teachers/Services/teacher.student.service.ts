import createHttpError from "http-errors";
import prisma from "../../../config/database";
import crypto, { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { sendMail } from "../../../utils/mailer";
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

// Threshold below which a student is considered "at risk"
const AT_RISK_ATTENTION_THRESHOLD = 40;
const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  createdBy: true,
  createdAt: true,
} as const;

export const TeacherStudentService = {
  // ─── Validate teacher ─────────────────────────────────────────────────────
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== userRole.Teacher) {
      await logActivity(userId, "UNAUTHORIZED_ACCESS_ATTEMPT");
      throw createHttpError(403, "Only teachers can manage students.");
    }
    return user;
  },

  // ─── Validate that students are registered under this teacher ─────────────
  async validateStudentsRegistered(teacherId: string, studentIds: string[]) {
    const uniqueIds = [...new Set(studentIds)];

    const links = await prisma.teacherStudent.findMany({
      where: { teacherId, studentId: { in: uniqueIds } },
      select: { studentId: true },
    });

    const registeredIds = new Set(links.map((l) => l.studentId));
    const unregistered = uniqueIds.filter((id) => !registeredIds.has(id));

    if (unregistered.length > 0) {
      throw createHttpError(
        400,
        `The following students are not registered under you: ${unregistered.join(", ")}. Please register them first.`
      );
    }

    return true;
  },
  // ─── STUDENT MANAGEMENT PAGE ──────────────────────────────────────────────
  /**
   * Returns the 4 KPI cards + the student table rows needed for the
   * Student Management page:
   *   totalStudents, atRisk, avgFocusScore (%), activeGroups
   *   students[]: { id, name, email, group, focusScore, emotion, attention }
   */
  async getStudentManagementOverview(teacherId: string) {
    await this.validateTeacher(teacherId);

    const students = await prisma.user.findMany({
      where: {
        role: userRole.Student,
        OR: [
          { createdBy: teacherId },
          { studentTeachers: { some: { teacherId } } },
        ],
      },
      include: {
        cognitive: true,
        emotionLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        groupMemberships: {
          include: { group: { select: { id: true, name: true } } },
        },
      },
    });

    const MAX_FOCUS_SECONDS = 3600;

    const rows = students.map((s) => {
      const attentionScore = s.cognitive?.attentionScore ?? null;
      const focusDuration = s.cognitive?.focusDuration ?? null;
      const focusScorePct =
        focusDuration !== null
          ? Math.min(100, Math.round((focusDuration / MAX_FOCUS_SECONDS) * 100))
          : null;

      const latestEmotion = s.emotionLogs[0]?.emotion ?? null;
      const primaryGroup =
        s.groupMemberships.length > 0 ? s.groupMemberships[0].group : null;

      const isAtRisk =
        attentionScore !== null && attentionScore < AT_RISK_ATTENTION_THRESHOLD;

      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        group: primaryGroup ? { id: primaryGroup.id, name: primaryGroup.name } : null,
        focusScore: focusScorePct,       // e.g. 92 → "92%"
        emotion: latestEmotion,          // e.g. "Engaged"
        attention: attentionScore,
        isAtRisk,
      };
    });

    const atRiskCount = rows.filter((r) => r.isAtRisk).length;

    const avgFocusRaw =
      rows.filter((r) => r.focusScore !== null).reduce((a, r) => a + (r.focusScore ?? 0), 0) /
      (rows.filter((r) => r.focusScore !== null).length || 1);

    const activeGroupIds = new Set(
      students.flatMap((s) => s.groupMemberships.map((m) => m.group.id))
    );

    await logActivity(teacherId, "VIEW_STUDENT_MANAGEMENT_OVERVIEW", `students=${students.length}`);

    return {
      totalStudents: students.length,
      atRisk: atRiskCount,
      avgFocusScore: Math.round(avgFocusRaw), // percentage
      activeGroups: activeGroupIds.size,
      students: rows,
    };
  },

  /**
   * Search students by name or email (for the search bar on Students page).
   */
  async searchStudents(teacherId: string, query: string) {
    await this.validateTeacher(teacherId);

    return prisma.user.findMany({
      where: {
        role: userRole.Student,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdBy: true,
      },
      take: 20,
    });
  },

  // ─── GROUP MANAGEMENT ─────────────────────────────────────────────────────
  async createGroup(teacherId: string, name: string, description?: string) {
    await this.validateTeacher(teacherId);
    await logActivity(teacherId, "GROUP_CREATE", `name=${name}`);
    return prisma.group.create({ data: { name, description, teacherId } });
  },

  async getGroups(teacherId: string) {
    await this.validateTeacher(teacherId);
    const groups = await prisma.group.findMany({
      where: { teacherId },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    await logActivity(teacherId, "VIEW_GROUPS", `count=${groups.length}`);
    return groups;
  },

  async updateGroup(
    teacherId: string,
    groupId: string,
    updateData: { name?: string; description?: string }
  ) {
    await this.validateTeacher(teacherId);
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherId)
      throw createHttpError(404, "Group not found or unauthorized.");

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        name: updateData.name ?? group.name,
        description: updateData.description ?? group.description,
      },
    });
    await logActivity(teacherId, "GROUP_UPDATE", `groupId=${groupId}`);
    return updatedGroup;
  },

  async deleteGroup(teacherId: string, groupId: string) {
    await this.validateTeacher(teacherId);
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherId)
      throw createHttpError(404, "Group not found or unauthorized.");

    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.group.delete({ where: { id: groupId } });
    await logActivity(teacherId, "GROUP_DELETE", `groupId=${groupId}`);
    return { message: "Group deleted successfully." };
  },

  async addMembersToGroup(teacherId: string, groupId: string, studentIds: string[]) {
    await this.validateTeacher(teacherId);
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherId)
      throw createHttpError(404, "Group not found or unauthorized.");

    const students = await prisma.user.findMany({
      where: { id: { in: studentIds }, role: userRole.Student },
    });
    if (!students.length) throw createHttpError(400, "No valid students provided.");

    await this.validateStudentsRegistered(teacherId, students.map((s) => s.id));

    await logActivity(teacherId, "GROUP_ADD_MEMBERS", `groupId=${groupId}, count=${students.length}`);
    return prisma.$transaction(
      students.map((s) =>
        prisma.groupMember.upsert({
          where: { compositeId: { groupId, userId: s.id } },
          create: { groupId, userId: s.id },
          update: {},
        })
      )
    );
  },

  async addStudentToGroup(teacherId: string, groupId: string, studentId: string) {
    await this.validateTeacher(teacherId);
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherId)
      throw createHttpError(403, "Group not found or unauthorized.");

    const student = await prisma.user.findFirst({
      where: { id: studentId, role: userRole.Student },
    });
    if (!student) throw createHttpError(404, "Student not found.");

    await this.validateStudentsRegistered(teacherId, [studentId]);

    await logActivity(teacherId, "GROUP_ADD_STUDENT", `groupId=${groupId}, studentId=${studentId}`);
    return prisma.groupMember.upsert({
      where: { compositeId: { groupId, userId: studentId } },
      create: { groupId, userId: studentId },
      update: {},
    });
  },

  async removeStudentFromGroup(teacherId: string, groupId: string, studentId: string) {
    await this.validateTeacher(teacherId);
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherId)
      throw createHttpError(403, "Group not found or unauthorized.");

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== userRole.Student)
      throw createHttpError(404, "Student not found.");

    const membership = await prisma.groupMember.findUnique({
      where: { compositeId: { groupId, userId: studentId } },
    });
    if (!membership)
      throw createHttpError(400, "Student is not a member of this group.");

    await prisma.groupMember.delete({
      where: { compositeId: { groupId, userId: studentId } },
    });
    await logActivity(teacherId, "GROUP_REMOVE_STUDENT", `groupId=${groupId}, studentId=${studentId}`);
    return { message: "Student removed from group successfully." };
  },

  // ─── STUDENT REGISTRATION / INVITE ────────────────────────────────────────
  async registerStudent(
    teacherId: string,
    studentData: { firstName: string; lastName: string; email: string }
  ) {
    await this.validateTeacher(teacherId);

    const existingStudent = await prisma.user.findUnique({
      where: { email: studentData.email },
      select: safeUserSelect,
    });

    if (existingStudent) {
      if (existingStudent.role !== userRole.Student)
        throw createHttpError(400, "This email belongs to a non-student user.");

      const alreadyLinked = await prisma.teacherStudent.findFirst({
        where: { teacherId, studentId: existingStudent.id },
      });
      if (alreadyLinked) {
        await logActivity(teacherId, "STUDENT_REGISTER_ATTEMPT", `already linked: ${existingStudent.id}`);
        return {
          message: "Student already registered under this teacher.",
          linked: false,
          student: existingStudent,
        };
      }

      await prisma.teacherStudent.create({ data: { teacherId, studentId: existingStudent.id } });
      await prisma.notification.create({
        data: {
          studentId: existingStudent.id,
          title: "New Teacher Connection",
          message: `You have been added under teacher ${teacherId}.`,
          type: "INFO",
        },
      });
      await sendMail({
        to: existingStudent.email,
        subject: "You've been added under a new teacher",
        html: `
          <h2>Hi ${existingStudent.firstName},</h2>
          <p>Your teacher has added you to their class on <strong>NeuroViz</strong>.</p>
          <p>You can now access your assignments and resources from your dashboard.</p>
          <p>Happy learning!</p>
          <p><i>If you are not the intended recipient, please ignore this message.</i></p>
        `,
        teacherId,
        studentId: existingStudent.id,
      });
      await logActivity(teacherId, "STUDENT_REGISTERED", `linked: ${existingStudent.id}`);
      return {
        message: "Existing student linked and notified successfully.",
        linked: true,
        student: existingStudent,
      };
    }

    const tempPassword = randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newStudent = await prisma.user.create({
      data: {
        ...studentData,
        role: userRole.Student,
        createdBy: teacherId,
        password: hashedPassword,
      },
    });

    await prisma.teacherStudent.create({ data: { teacherId, studentId: newStudent.id } });

    await sendMail({
      to: newStudent.email,
      subject: "Welcome to NeuroViz!",
      html: `
        <h2>Welcome, ${newStudent.firstName}!</h2>
        <p>Your teacher added you to NeuroViz.</p>
        <p>Your temporary password: <b>${tempPassword}</b></p>
        <p>Please change your password after your first login.</p>
        <p><i>If you are not the intended recipient, please ignore this message.</i></p>
      `,
      teacherId,
      studentId: newStudent.id,
    });
    await logActivity(teacherId, "STUDENT_CREATED", `studentId=${newStudent.id}`);
    return {
      message: "New student created and notified.",
      linked: true,
      student: { ...newStudent, password: undefined },
    };
  },

  async unregisterStudent(teacherId: string, studentId: string) {
    await this.validateTeacher(teacherId);

    const link = await prisma.teacherStudent.findUnique({
      where: { UniqueTeacherStudent: { teacherId, studentId } },
    });

    if (!link) {
      throw createHttpError(404, "This student is not registered under you.");
    }

    await prisma.teacherStudent.delete({
      where: { UniqueTeacherStudent: { teacherId, studentId } },
    });

    await prisma.notification.create({
      data: {
        studentId,
        title: "Teacher Connection Removed",
        message: `You have been removed from a teacher's class on NeuroViz.`,
        type: "INFO",
      },
    });

    await logActivity(teacherId, "STUDENT_UNREGISTERED", `studentId=${studentId}`);

    return { message: "Student unregistered successfully.", studentId };
  },

  async inviteStudent(teacherId: string, email: string) {
    await this.validateTeacher(teacherId);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      throw createHttpError(400, "A user with this email already exists.");

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { firstName: true, lastName: true },
    });
    if (!teacher) throw createHttpError(404, "Teacher not found.");

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hrs

    const invite = await prisma.studentInvite.upsert({
      where: { email },
      create: { email, token, teacherId, expiresAt },
      update: { token, expiresAt, used: false },
    });

    const inviteLink = `${process.env.CLIENT_URL}invite/accept?token=${token}`;

    await sendMail({
      to: email,
      subject: "You've been invited to NeuroViz",
      html: `
        <h2>Welcome to NeuroViz</h2>
        <p>Your teacher <strong>${teacher.firstName} ${teacher.lastName}</strong> has invited you to join their class.</p>
        <a href="${inviteLink}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;">Accept Invitation</a>
        <p>This link expires in 24 hours.</p>
        <p><i>If you are not the intended recipient, please ignore this message.</i></p>
      `,
      teacherId,
      studentId: null,
    });
    await logActivity(teacherId, "STUDENT_INVITED", `email=${email}`);
    return { email, inviteLink, expiresAt };
  },

  async inviteStudentToGroup(teacherId: string, email: string, groupId: string) {
  await this.validateTeacher(teacherId);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { teacher: true },
  });
  if (!group || group.teacherId !== teacherId)
    throw createHttpError(404, "Group not found or unauthorized.");

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (existingUser.role !== userRole.Student)
      throw createHttpError(400, "This email belongs to a non-student user.");

    // ── Ensure the student is registered under this teacher first ──
    const alreadyLinked = await prisma.teacherStudent.findUnique({
      where: { UniqueTeacherStudent: { teacherId, studentId: existingUser.id } },
    });
    if (!alreadyLinked) {
      await prisma.teacherStudent.create({ data: { teacherId, studentId: existingUser.id } });
      await logActivity(teacherId, "STUDENT_AUTO_REGISTERED_VIA_GROUP_INVITE", `studentId=${existingUser.id}`);
    }

    const membership = await prisma.groupMember.findUnique({
      where: { compositeId: { groupId, userId: existingUser.id } },
    });
    if (membership)
      return {
        message: "Student already a member of the group.",
        added: false,
        user: { id: existingUser.id, email: existingUser.email },
      };

    await prisma.groupMember.create({ data: { groupId, userId: existingUser.id } });
      const inviteLink = `${process.env.CLIENT_URL}/group/${groupId}`;
      await sendMail({
        to: existingUser.email,
        subject: `Added to ${group.name} on NeuroViz`,
        html: `
          <h2>You've been added to <strong>${group.name}</strong></h2>
          <p>Your teacher <strong>${group.teacher.firstName} ${group.teacher.lastName}</strong> has added you to the group.</p>
          <a href="${inviteLink}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;">Open Group</a>
        `,
        teacherId,
        studentId: existingUser.id,
      });
      await logActivity(teacherId, "GROUP_ADD_EXISTING_STUDENT", `groupId=${groupId}, studentId=${existingUser.id}`);
      return {
        message: "Existing student added to group and notified.",
        added: true,
        user: { id: existingUser.id, email: existingUser.email },
      };
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.studentInvite.upsert({
      where: { email },
      create: { email, token, teacherId, groupId, expiresAt },
      update: { token, expiresAt, used: false, groupId },
    });

    const inviteLink = `${process.env.CLIENT_URL}invite/accept?token=${token}`;
    await sendMail({
      to: email,
      subject: `Join ${group.name} on NeuroViz`,
      html: `
        <h2>You've been invited to join <strong>${group.name}</strong></h2>
        <p>Your teacher <strong>${group.teacher.firstName} ${group.teacher.lastName}</strong> has invited you.</p>
        <a href="${inviteLink}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;">Accept Invitation</a>
        <p>This link expires in 24 hours.</p>
        <p><i>If you are not the intended recipient, please ignore this message.</i></p>
      `,
      teacherId,
      studentId: null,
    });
    await logActivity(teacherId, "STUDENT_INVITED_TO_GROUP", `email=${email}, groupId=${groupId}`);
    return { email, inviteLink, group: group.name, expiresAt, invited: true };
  },
};