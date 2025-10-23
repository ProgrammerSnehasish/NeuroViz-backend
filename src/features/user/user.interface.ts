import { User, StudentProfile, TeacherProfile } from "@prisma/client";

export interface IUserDetails
  extends Omit<User, "password" | "hasId" | "save" | "remove" | "softRemove" | "recover" | "reload"> {
  studentProfile?: StudentProfile | null;
  teacherProfile?: TeacherProfile | null;
}
