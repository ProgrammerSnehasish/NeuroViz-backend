import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from "class-validator";

/**
 * 🎓 Assignment creation DTO
 */
export class AssignmentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  studentIds!: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  groupIds!: string[];
}

/**
 * 📤 Submission DTO (student uploads work)
 */
export class SubmissionDto {
  @IsString()
  @IsNotEmpty()
  assignmentId!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

/**
 * 🧑‍🏫 Create a new group (by teacher)
 */
export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * 🧾 Review DTO (teacher grades a submission)
 */
export class ReviewDto {
  @IsString()
  @IsNotEmpty()
  submissionId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  grade!: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

/**
 * 👩‍🎓 Register student manually (by teacher)
 */
export class RegisterStudentDto {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

/**
 * 📩 Invite student via email (by teacher)
 */
export class InviteStudentDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class InviteStudentToGroupDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  groupId!: string;
}
/**
 * ✅ Accept invite (student side)
 */
export class AcceptInviteDto {
  @IsNotEmpty()
  @IsString()
  token!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;
}

/**
 * 👥 Add multiple members to a group
 */
export class AddMembersToGroupDto {
  @IsNotEmpty()
  @IsString()
  groupId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  studentIds!: string[];
}

/**
 * ➕ Add single student to a group
 */
export class AddStudentToGroupDto {
  @IsNotEmpty()
  @IsString()
  groupId!: string;

  @IsString()
  @IsNotEmpty()
  studentId!: string;
}

/**
 * 🔍 Search DTO (for admin or teacher filtering)
 */
export class SearchQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  role?: "TEACHER" | "STUDENT";

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}