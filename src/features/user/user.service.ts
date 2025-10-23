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
    const user = await prisma.user.findUnique({ where: { email } });
    if (user !== null) {
      return getUserResponse(user);
    }
    throw createHttpError(400, "User with email " + email + " is not found");
  }

  async getUserById(id: string): Promise<IUserDetails> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user !== null) {
      return getUserResponse(user);
    }
    throw createHttpError(400, "User not found");
  }

  async updateUser(data: UpdateUserDto, userId: string): Promise<IUserDetails> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createHttpError(404, "User does not exist");

  // optional: check ownership/authorization (if needed)
  if (user.id !== userId) throw createHttpError(403, "Not authorized to update this user");

  // prepare data to update
  const updateData: Record<string, any> = {
    updatedBy: userId,
  };

  if (data.firstName) updateData.firstName = data.firstName;
  if (data.middleName) updateData.middleName = data.middleName;
  if (data.lastName) updateData.lastName = data.lastName;
  if (data.dob) updateData.dob = data.dob;
  if (data.education) updateData.education = data.education;
  if (data.email) updateData.email = data.email;
  if (data.homeTown) updateData.homeTown = data.homeTown;
  if (data.currentCity) updateData.currentCity = data.currentCity;
  if (data.gender) updateData.gender = data.gender;

  if (data.password) {
    updateData.password = await hash(data.password, 10);
  }

  // check if any fields (except updatedBy) are being updated
  if (Object.keys(updateData).length === 1) {
    throw createHttpError(400, "No valid fields provided to update profile");
  }

  // ✅ prisma.update returns the updated record
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return getUserResponse(updatedUser);
}


  async deleteUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({where: {id: userId}});
    if (user === null) throw createHttpError(404, "User not found.");
    await prisma.user.delete({ where: { id: userId } });
  }
}
