import createHttpError from "http-errors";
import prisma from "../../../config/database";
import crypto, { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { sendMail } from "../../../utils/mailer";

export const TeacherStudentService = {
  /**
   * 🔒 Validate if the user is a teacher
   */
  async validateTeacher(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "TEACHER")
      throw createHttpError(403, "Only teachers can manage assignments.");
    return user;
  },

  /**
   * 🧩 Create a new group under a teacher
   */
  async createGroup(teacherId: string, name: string, description?: string) {
    await this.validateTeacher(teacherId);
    return prisma.group.create({ data: { name, description, teacherId } });
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

    return updatedGroup;
  },

  /**
   * 🗑️ Delete a group (and optionally its members)
   */
  async deleteGroup(teacherId: string, groupId: string) {
    await this.validateTeacher(teacherId);

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherId)
      throw createHttpError(404, "Group not found or unauthorized.");

    // Delete related group members first (optional, depending on schema)
    await prisma.groupMember.deleteMany({ where: { groupId } });

    await prisma.group.delete({ where: { id: groupId } });

    return { message: "Group deleted successfully." };
  },
  
  /**
   * 🔍 Search for students (by name or email)
   */
  async searchStudents(teacherId: string, query: string) {
    await this.validateTeacher(teacherId);

    return prisma.user.findMany({
      where: {
        role: "STUDENT",
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

  /**
   * 🧾 Register a new student under the teacher
   * Generates a temporary random password (hashed)
   */
  async registerStudent(
    teacherId: string,
    studentData: { firstName: string; lastName: string; email: string }
  ) {
    await this.validateTeacher(teacherId);

    // ✅ Check if the student already exists
    const existingStudent = await prisma.user.findUnique({
      where: { email: studentData.email },
    });

    // --- Case 1: Existing Student ---
    if (existingStudent) {
      if (existingStudent.role !== "STUDENT") {
        throw createHttpError(400, "This email belongs to a non-student user.");
      }

      // Check if already linked with this teacher
      const alreadyLinked = await prisma.teacherStudent.findFirst({
        where: { teacherId, studentId: existingStudent.id },
      });

      if (alreadyLinked) {
        return {
          message: "Student already registered under this teacher.",
          linked: false,
          student: existingStudent,
        };
      }

      // ✅ Link student to teacher
      await prisma.teacherStudent.create({
        data: {
          teacherId,
          studentId: existingStudent.id,
        },
      });

      // ✅ Create notification for student
      await prisma.notification.create({
        data: {
          studentId: existingStudent.id,
          title: "New Teacher Connection",
          message: `You have been added under teacher ${teacherId}.`,
          type: "INFO",
        },
      });

      // ✅ Send notification email (optional)
      await sendMail({
        to: existingStudent.email,
        subject: "You’ve been added under a new teacher",
        html: `
          <h2>Hi ${existingStudent.firstName},</h2>
          <p>Your teacher has added you to their class on <strong>NeuroViz</strong>.</p>
          <p>You can now access your assignments and resources from your dashboard.</p>
          <p>Happy learning!</p>

          <p><i>If you are not the intended recipient of this email, please ignore this message. We sincerely apologize for the error.</i></p>
        `,
        teacherId,
        studentId: existingStudent.id,
      });

      return {
        message: "Existing student linked and notified successfully.",
        linked: true,
        student: existingStudent,
      };
    }

    // --- Case 2: New Student (create + email temporary password) ---
    const tempPassword = randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newStudent = await prisma.user.create({
      data: {
        ...studentData,
        role: "STUDENT",
        createdBy: teacherId,
        password: hashedPassword,
      },
    });

    // ✅ Link to teacher
    await prisma.teacherStudent.create({
      data: {
        teacherId,
        studentId: newStudent.id,
      },
    });

    // ✅ Send welcome mail
    await sendMail({
      to: newStudent.email,
      subject: "Welcome to NeuroViz!",
      html: `
        <h2>Welcome, ${newStudent.firstName}!</h2>
        <p>Your teacher added you to NeuroViz.</p>
        <p>You can log in using this temporary password:</p>
        <p><b>${tempPassword}</b></p>
        <p>Please change your password after your first login.</p>

        <p><i>If you are not the intended recipient of this email, please ignore this message. We sincerely apologize for the error.</i></p>
      `,
      teacherId,
      studentId: newStudent.id,
    });

    // ✅ Create notification for new student
    await prisma.notification.create({
      data: {
        studentId: newStudent.id,
        title: "Welcome to NeuroViz!",
        message: "Your teacher has registered you on NeuroViz. Check your email for login details.",
        type: "WELCOME",
      },
    });

    return {
      message: "New student registered and notified successfully.",
      linked: true,
      student: newStudent,
    };
  },

  /**
   * 👥 Add multiple students to an existing group
   */
  async addMembersToGroup(teacherId: string, groupId: string, studentIds: string[]) {
    await this.validateTeacher(teacherId);

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherId)
      throw createHttpError(404, "Group not found or unauthorized.");

    const students = await prisma.user.findMany({
      where: { id: { in: studentIds }, role: "STUDENT" },
    });
    if (!students.length) throw createHttpError(400, "No valid students provided.");

    return prisma.$transaction(
      students.map((s) =>
        prisma.groupMember.upsert({
          where: { compositeId: { groupId, userId: s.id } }, // Assuming composite unique
          create: { groupId, userId: s.id },
          update: {},
        })
      )
    );
  },

  /**
   * 👤 Add a single student to an existing group
   */
  async addStudentToGroup(teacherId: string, groupId: string, studentId: string) {
    await this.validateTeacher(teacherId);

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherId)
      throw createHttpError(403, "Group not found or unauthorized.");

    const student = await prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT" },
    });
    if (!student) throw createHttpError(404, "Student not found.");

    return prisma.groupMember.upsert({
      where: { compositeId: { groupId, userId: studentId } },
      create: { groupId, userId: studentId },
      update: {},
    });
  },

  /**
   * 📩 Invite a student via email (invite link)
   */
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

  const inviteLink = `${process.env.FRONTEND_URL}/invite/accept?token=${token}`;

  // ✅ Include teacherId
  await sendMail({
    to: email,
    subject: "You’ve been invited to NeuroViz",
    html: `
      <h2>Welcome to NeuroViz</h2>
      <p>Your teacher <strong>${teacher.firstName} ${teacher.lastName}</strong> has invited you to join their class.</p>
      <p>Click below to register and accept your invitation:</p>
      <a href="${inviteLink}" style="display:inline-block;padding:10px 16px;background:#007bff;color:white;border-radius:8px;text-decoration:none;">Accept Invitation</a>
      <p>This link expires in 24 hours.</p>

      <p><i>If you are not the intended recipient of this email, please ignore this message. We sincerely apologize for the error.</i></p>
    `,
    teacherId,
    studentId: null, // no student account yet
  });

  return { email, inviteLink, expiresAt };
},

  /**
   * 📩 Invite a student to a specific group via email
   */

  async inviteStudentToGroup(teacherId: string, email: string, groupId: string) {
  await this.validateTeacher(teacherId);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { teacher: true },
  });

  if (!group || group.teacherId !== teacherId) {
    throw createHttpError(404, "Group not found or unauthorized.");
  }

  // Check if a user already exists with this email
  const existingUser = await prisma.user.findUnique({ where: { email } });

  // If user exists and is a STUDENT -> add to group (if not already)
  if (existingUser) {
    if (existingUser.role !== "STUDENT") {
      throw createHttpError(400, "This email belongs to a non-student user.");
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: { compositeId: { groupId, userId: existingUser.id } },
    });

    if (membership) {
      return {
        message: "Student already a member of the group.",
        added: false,
        user: { id: existingUser.id, email: existingUser.email },
      };
    }

    // Add student to group
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: existingUser.id,
      },
    });

    // Send notification email to existing student (studentId set)
    const token = crypto.randomBytes(24).toString("hex"); // optional token if you want
    const inviteLink = `${process.env.FRONTEND_URL}/group/${groupId}`; // link to group page (adjust as needed)

    await sendMail({
      to: existingUser.email,
      subject: `Added to ${group.name} on NeuroViz`,
      html: `
        <h2>You've been added to <strong>${group.name}</strong></h2>
        <p>Your teacher <strong>${group.teacher.firstName} ${group.teacher.lastName}</strong> has added you to the group.</p>
        <p><a href="${inviteLink}" style="display:inline-block;padding:10px 16px;background:#007bff;color:white;border-radius:8px;text-decoration:none;">Open Group</a></p>
      `,
      teacherId,                     // sender (teacher)
      studentId: existingUser.id,    // recipient (student)
    });

    return {
      message: "Existing student added to group and notified.",
      added: true,
      user: { id: existingUser.id, email: existingUser.email },
    };
  }

  // If user does NOT exist -> create an invite (email will create account on accept)
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

  const invite = await prisma.studentInvite.upsert({
    where: { email },
    create: { email, token, teacherId, groupId, expiresAt },
    update: { token, expiresAt, used: false, groupId },
  });

  // Make sure FRONTEND_URL is set; otherwise inviteLink will be wrong
  const inviteLink = `${process.env.FRONTEND_URL}/invite/accept?token=${token}`;

  await sendMail({
    to: email,
    subject: `Join ${group.name} on NeuroViz`,
    html: `
      <h2>You've been invited to join <strong>${group.name}</strong></h2>
      <p>Your teacher <strong>${group.teacher.firstName} ${group.teacher.lastName}</strong> has invited you to join their group.</p>
      <p><a href="${inviteLink}" style="display:inline-block;padding:10px 16px;background:#007bff;color:white;border-radius:8px;text-decoration:none;">Accept Invitation</a></p>
      <p>This link expires in 24 hours.</p>

      <p><i>If you are not the intended recipient of this email, please ignore this message. We sincerely apologize for the error.</i></p>
    `,
    teacherId,
    studentId: null,
  });

  return { email, inviteLink, group: group.name, expiresAt, invited: true };
}
};
