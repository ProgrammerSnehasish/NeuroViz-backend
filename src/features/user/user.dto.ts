import {
  Gender,
  Qualification,
  Education,
  Affiliation,
  NeuroProblemType,
} from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

/* ───────────────────────────────
   USER BASIC UPDATE DTO
──────────────────────────────── */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  homeTown?: string;

  @IsOptional()
  @IsString()
  currentCity?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

   @IsOptional()
  @IsString()
  profilePhoto?: string; // webcam snapshot or uploaded file URL

  // nested student/teacher DTOs will be validated separately
  @IsOptional()
  studentProfile?: UpdateStudentProfileDto;

  @IsOptional()
  teacherProfile?: UpdateTeacherProfileDto;
}

/* ───────────────────────────────
   STUDENT PROFILE UPDATE DTO
──────────────────────────────── */
export class UpdateStudentProfileDto {
  @IsEnum(Education)
  @IsOptional()
  education?: Education;

  @IsEnum(Affiliation)
  @IsOptional()
  affiliation?: Affiliation;

  @IsEnum(NeuroProblemType)
  @IsOptional()
  neuroProblemType?: NeuroProblemType;

  @IsOptional()
  @IsString()
  instituteName?: string;

  @IsOptional()
  @IsString()
  guardianName?: string;
}

/* ───────────────────────────────
   TEACHER PROFILE UPDATE DTO
──────────────────────────────── */
export class UpdateTeacherProfileDto {
  @IsEnum(Qualification)
  @IsOptional()
  qualification?: Qualification;

  @IsOptional()
  @IsInt()
  experience?: number;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  instituteName?: string;
}
