import createHttpError from "http-errors";
import { SignupDto } from "../../auth/auth.dto";
import { getUserResponse } from "../../utils/util";
import { UpdateUserDto } from "./user.dto";
import { IUserDetails } from "./user.interface";
import prisma from "../../config/database";
import { hash } from "bcrypt";

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

  async updateUser(data: UpdateUserDto, userId: string): Promise<IUserDetails> {
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
  if (data.cursorMovement) updateData.cursorMovement = data.cursorMovement;
  if (data.eyeTrackingData) updateData.eyeTrackingData = data.eyeTrackingData;
  if (data.password) updateData.password = await hash(data.password, 10);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  // now update linked profile based on role
  if (updatedUser.role === "STUDENT") {
    const studentProfileData: Record<string, any> = {};

    if ((data as any).education) studentProfileData.education = (data as any).education;
    if ((data as any).affiliation) studentProfileData.affiliation = (data as any).affiliation;
    if ((data as any).instituteName) studentProfileData.instituteName = (data as any).instituteName;
    if ((data as any).guardianName) studentProfileData.guardianName = (data as any).guardianName; // ✅ fixed spelling
    if ((data as any).neuroProblemType) studentProfileData.neuroProblemType = (data as any).neuroProblemType;

    if (Object.keys(studentProfileData).length > 0) {
      await prisma.studentProfile.upsert({
        where: { userId },
        update: studentProfileData,
        create: { userId, ...studentProfileData },
      });
    }
  }

  if (updatedUser.role === "TEACHER") {
    const teacherProfileData: Record<string, any> = {};

    if ((data as any).qualification) teacherProfileData.qualification = (data as any).qualification;
    if ((data as any).experience !== undefined) teacherProfileData.experience = (data as any).experience;
    if ((data as any).specialization) teacherProfileData.specialization = (data as any).specialization;
    if ((data as any).instituteName) teacherProfileData.instituteName = (data as any).instituteName;

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


  async deleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createHttpError(404, "User not found.");

  // Delete dependent profiles first (if any)
  await prisma.studentProfile.deleteMany({ where: { userId } });
  await prisma.teacherProfile.deleteMany({ where: { userId } });

  // Now safe to delete user
  await prisma.user.delete({ where: { id: userId } });
}
}
