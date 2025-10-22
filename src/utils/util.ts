import { User, Role } from "@prisma/client";
import { IUserDetails } from "../features/user/user.interface";

export function getUserResponse(user: User): IUserDetails {
  return {
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt ?? new Date(0), // ✅ fallback if null
    isActive: (user as any).isActive ?? true,
    createdBy: (user as any).createdBy ?? "",
    updatedBy: (user as any).updatedBy ?? "",
    firstName: user.firstName,
    middleName: user.middleName ?? "", // ✅ null → empty string
    lastName: user.lastName,
    dob: (user as any).dob ?? null,
    email: user.email,
    homeTown: (user as any).homeTown ?? "",
    currentCity: (user as any).currentCity ?? "",
    gender: (user as any).gender ?? "",
    role: user.role as unknown as Role,
  };
}
