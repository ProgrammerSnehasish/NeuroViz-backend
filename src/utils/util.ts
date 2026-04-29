import { User, Role, StudentProfile, TeacherProfile } from "@prisma/client";
import { IUserDetails } from "../features/user/user.interface";

export function getUserResponse(
  user: User & { studentProfile?: StudentProfile | null; teacherProfile?: TeacherProfile | null }
): IUserDetails {
  return {
    id: user.id,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt ?? new Date(0),
    isActive: (user as any).isActive ?? true,
    createdBy: (user as any).createdBy ?? "",
    updatedBy: (user as any).updatedBy ?? "",
    firstName: user.firstName,
    middleName: user.middleName ?? "",
    lastName: user.lastName,
    preferences: (user as any).preferences ?? {},
    dob: (user as any).dob ?? null,
    email: user.email,
    homeTown: (user as any).homeTown ?? "",
    currentCity: (user as any).currentCity ?? "",
    gender: (user as any).gender ?? "",
    role: user.role as Role,
    profilePhoto: user.profilePhoto ?? "",

    // include full objects now
    studentProfile: user.studentProfile ?? null,
    teacherProfile: user.teacherProfile ?? null,
  };
}
