import {
  Gender,
  Qualification,
  Education,
  Affiliation,
  NeuroProblemType,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Languages, Subjects } from "../../config/core";

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

  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/)
  guardianPhone?: string;
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
  experienceYears?: number;

  @IsOptional()
  @IsString()
  experienceDetails?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Subjects, { each: true })
  subjects?: Subjects[];

  @IsOptional()
  @IsArray()
  @IsEnum(Languages, { each: true })
  languages?: Languages[];

  @IsOptional()
  @IsString()
  instituteName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: "Phone must be in E.164 format",
  })
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];
}

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
  @ValidateNested()
  @Type(() => UpdateStudentProfileDto)
  studentProfile?: UpdateStudentProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTeacherProfileDto)
  teacherProfile?: UpdateTeacherProfileDto;
}
