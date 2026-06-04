import createHttpError from "http-errors";
import { SignupDto } from "../../auth/auth.dto";
import { getUserResponse } from "../../utils/util";
import { UpdateUserDto } from "./user.dto";
import { IUserDetails } from "./user.interface";
import prisma from "../../config/database";
import { hash } from "bcrypt";
import { userRole } from "../../config/core";

export class UserService {
  static async createUser(data: SignupDto): Promise<string> {
    return "created";
  }

  private async validateUserAccess(requestedUserId: string, tokenUserId: string) {
    if (requestedUserId !== tokenUserId) {
      await prisma.activityLog.create({
        data: {
          userId: tokenUserId,
          action: "UNAUTHORIZED_USER_OPERATION",
          details: `Token user ${tokenUserId} attempted to operate on user ${requestedUserId}`,
        },
      });

      throw createHttpError(403, "Unauthorized: User token mismatch.");
    }
  }

  async getUser(email: string, tokenUserId: string): Promise<IUserDetails> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) throw createHttpError(400, `User with email ${email} not found`);

    await this.validateUserAccess(user.id, tokenUserId);

    return getUserResponse(user);
  }

  async getUserById(id: string, tokenUserId: string): Promise<IUserDetails> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) throw createHttpError(400, "User not found");
    await this.validateUserAccess(user.id, tokenUserId);
    return getUserResponse(user);
  }

  async updateUser(data: UpdateUserDto, userId: string, tokenUserId: string): Promise<IUserDetails> {
    await this.validateUserAccess(userId, tokenUserId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User does not exist");

    // update basic user fields
    const updateData: Record<string, any> = { updatedBy: userId };
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.middleName !== undefined) updateData.middleName = data.middleName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.email) updateData.email = data.email;
    if (data.homeTown) updateData.homeTown = data.homeTown;
    if (data.currentCity) updateData.currentCity = data.currentCity;
    if (data.gender) updateData.gender = data.gender;
    if (data.profilePhoto) updateData.profilePhoto = data.profilePhoto;
    if (data.password) updateData.password = await hash(data.password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // now update linked profile based on role
    if (updatedUser.role === userRole.Student && data.studentProfile) {
  const studentProfileData: Record<string, any> = {};

  const studentProfileInfo = data.studentProfile;

  if (studentProfileInfo.education)
    studentProfileData.education = studentProfileInfo.education;

  if (studentProfileInfo.affiliation)
    studentProfileData.affiliation = studentProfileInfo.affiliation;

  if (studentProfileInfo.instituteName)
    studentProfileData.instituteName = studentProfileInfo.instituteName;

  if (studentProfileInfo.guardianName)
    studentProfileData.guardianName = studentProfileInfo.guardianName;

  if (studentProfileInfo.guardianEmail)
    studentProfileData.guardianEmail = studentProfileInfo.guardianEmail;

  if (studentProfileInfo.guardianPhone)
    studentProfileData.guardianPhone = studentProfileInfo.guardianPhone;

  if (studentProfileInfo.neuroProblemType)
    studentProfileData.neuroProblemType = studentProfileInfo.neuroProblemType;

  if (Object.keys(studentProfileData).length > 0) {
    await prisma.studentProfile.upsert({
      where: { userId },
      update: studentProfileData,
      create: { userId, ...studentProfileData },
    });
  }
}

    if (updatedUser.role === userRole.Teacher && data.teacherProfile) {
  const teacherProfileData: Record<string, any> = {};
  const t = data.teacherProfile;

  if (t.qualification) teacherProfileData.qualification = t.qualification;
  if (t.experienceYears !== undefined)
    teacherProfileData.experienceYears = t.experienceYears;
  if (t.experienceDetails)
    teacherProfileData.experienceDetails = t.experienceDetails;
  if (t.specialization)
    teacherProfileData.specialization = t.specialization;
  if (t.subjects) teacherProfileData.subjects = t.subjects;
  if (t.languages) teacherProfileData.languages = t.languages;
  if (t.instituteName)
    teacherProfileData.instituteName = t.instituteName;
  if (t.bio) teacherProfileData.bio = t.bio;
  if (t.phone) teacherProfileData.phone = t.phone;
  if (t.hourlyRate !== undefined)
    teacherProfileData.hourlyRate = t.hourlyRate;
  if (t.availability)
    teacherProfileData.availability = t.availability;
  if (t.certifications)
    teacherProfileData.certifications = t.certifications;

  if (Object.keys(teacherProfileData).length > 0) {
    await prisma.teacherProfile.upsert({
      where: { userId },
      update: teacherProfileData,
      create: { userId, ...teacherProfileData },
    });
  }
}

  // finally return updated full user details
  const finalUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      teacherProfile: true,
    },
  });

  return getUserResponse(finalUser!);
}


  async deleteUser(userId: string, tokenUserId: string): Promise < void> {
  await this.validateUserAccess(userId, tokenUserId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if(!user) throw createHttpError(404, "User not found.");

  // Delete dependent (child) entities first
  await prisma.$transaction([
    prisma.studentProfile.deleteMany({ where: { userId } }),
    prisma.teacherProfile.deleteMany({ where: { userId } }),
    prisma.cognitiveProfile.deleteMany({ where: { userId } }),
    prisma.emotionLog.deleteMany({ where: { userId } }),
    prisma.feedback.deleteMany({ where: { userId } }),
    prisma.mindmap.deleteMany({ where: { userId } }),
    prisma.adaptationLog.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({
      where: { OR: [{ teacherId: userId }, { studentId: userId }] },
    }),
    prisma.mailLog.deleteMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    }),
    prisma.teacherFeedback.deleteMany({
      where: { OR: [{ teacherId: userId }, { studentId: userId }] },
    }),
    prisma.assignmentStudent.deleteMany({ where: { studentId: userId } }),
    prisma.assignmentSubmission.deleteMany({ where: { studentId: userId } }),
    prisma.assignment.deleteMany({ where: { teacherId: userId } }),
    prisma.groupMember.deleteMany({ where: { userId } }),
    prisma.group.deleteMany({ where: { teacherId: userId } }),
    prisma.studentInvite.deleteMany({ where: { teacherId: userId } }),
    prisma.teacherStudent.deleteMany({
      where: { OR: [{ teacherId: userId }, { studentId: userId }] },
    }),
  ]);

  // Finally delete the user
  await prisma.user.delete({ where: { id: userId } });
}
}
