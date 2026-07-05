import createHttpError from "http-errors";
import { SignupDto } from "../../auth/auth.dto";
import { getUserResponse } from "../../utils/util";
import { UpdateUserDto } from "./user.dto";
import { IUserDetails } from "./user.interface";
import prisma from "../../config/database";
import { hash } from "bcrypt";
import { userRole } from "../../config/core";
import { uploadProfilePhoto } from "../../utils/uploadPhoto";
import { uploadCertification } from "../../utils/uploadCertification";

export class UserService {
  static async createUser(data: SignupDto): Promise<string> {
    return "created";
  }

  async getUser(email: string): Promise<IUserDetails> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) throw createHttpError(400, `User with email ${email} not found`);

    return getUserResponse(user);
  }

  async getUserById(id: string): Promise<IUserDetails> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) throw createHttpError(400, "User not found");

    return getUserResponse(user);
  }

  async updateUser(
    data: UpdateUserDto,
    userId: string,
    fileBuffer?: Buffer,
    certificationFiles?: Express.Multer.File[]
  ): Promise<IUserDetails> {

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User does not exist");

    const updateData: Record<string, any> = { updatedBy: userId };
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.middleName !== undefined) updateData.middleName = data.middleName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.email) updateData.email = data.email;
    if (data.homeTown) updateData.homeTown = data.homeTown;
    if (data.currentCity) updateData.currentCity = data.currentCity;
    if (data.gender) updateData.gender = data.gender;
    if (data.password) updateData.password = await hash(data.password, 10);

    if (fileBuffer) {
      updateData.profilePhoto = await uploadProfilePhoto(fileBuffer, userId);
    } else if (data.profilePhoto) {
      updateData.profilePhoto = data.profilePhoto;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    if (updatedUser.role === userRole.Student && data.studentProfile) {
      const studentProfileData: Record<string, any> = {};
      const s = data.studentProfile;

      if (s.education) studentProfileData.education = s.education;
      if (s.affiliation) studentProfileData.affiliation = s.affiliation;
      if (s.instituteName) studentProfileData.instituteName = s.instituteName;
      if (s.guardianName) studentProfileData.guardianName = s.guardianName;
      if (s.guardianEmail) studentProfileData.guardianEmail = s.guardianEmail;
      if (s.guardianPhone) studentProfileData.guardianPhone = s.guardianPhone;
      if (s.neuroProblemType) studentProfileData.neuroProblemType = s.neuroProblemType;

      if (Object.keys(studentProfileData).length > 0) {
        await prisma.studentProfile.upsert({
          where: { userId },
          update: studentProfileData,
          create: { userId, ...studentProfileData },
        });
      }
    }

    if (updatedUser.role === userRole.Teacher && (data.teacherProfile || (certificationFiles && certificationFiles.length > 0))) {
      const teacherProfileData: Record<string, any> = {};
      const t = data.teacherProfile ?? {};

      if (t.qualification) teacherProfileData.qualification = t.qualification;
      if (t.experienceYears !== undefined) teacherProfileData.experienceYears = t.experienceYears;
      if (t.experienceDetails) teacherProfileData.experienceDetails = t.experienceDetails;
      if (t.specialization) teacherProfileData.specialization = t.specialization;
      if (t.subjects) teacherProfileData.subjects = t.subjects;
      if (t.languages) teacherProfileData.languages = t.languages;
      if (t.instituteName) teacherProfileData.instituteName = t.instituteName;
      if (t.bio) teacherProfileData.bio = t.bio;
      if (t.phone) teacherProfileData.phone = t.phone;
      if (t.hourlyRate !== undefined) teacherProfileData.hourlyRate = t.hourlyRate;
      if (t.availability) teacherProfileData.availability = t.availability;

      if (certificationFiles && certificationFiles.length > 0) {
        const uploadedUrls = await Promise.all(
          certificationFiles.map((file) =>
            uploadCertification(file.buffer, userId, file.originalname)
          )
        );

        const existing = await prisma.teacherProfile.findUnique({
          where: { userId },
          select: { certifications: true },
        });

        teacherProfileData.certifications = [
          ...(existing?.certifications ?? []),
          ...uploadedUrls,
        ];
      } else if (t.certifications) {
        teacherProfileData.certifications = t.certifications;
      }

      if (Object.keys(teacherProfileData).length > 0) {
        await prisma.teacherProfile.upsert({
          where: { userId },
          update: teacherProfileData,
          create: { userId, ...teacherProfileData },
        });
      }
    }

    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, teacherProfile: true },
    });

    return getUserResponse(finalUser!);
  }

  async deleteUser(userId: string): Promise<void> {

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found.");

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
