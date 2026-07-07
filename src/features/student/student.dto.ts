import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from "class-validator";
import { Expose } from "class-transformer";

/**
 * ✅ Accept teacher invite & complete account setup
 * Schema: StudentInvite { token }, User { firstName, lastName, password }
 */
export class AcceptInviteDto {
  @IsNotEmpty()
  @IsString()
  token!: string;

  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;
}

/**
 * 📤 Submit work for an assignment
 * Schema: AssignmentSubmission { assignmentId, studentId, content }
 */


export enum SubmissionContentType {
  TEXT     = "TEXT",
  MINDMAP  = "MINDMAP",
  DOCUMENT = "DOCUMENT",
  MIXED    = "MIXED",
}

export class CreateSubmissionDto {
  @Expose()
  @IsUUID()
  assignmentId: string;

  @Expose()
  @IsEnum(SubmissionContentType)
  contentType: SubmissionContentType;

  // Required if contentType is TEXT or MIXED
  @Expose()
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.contentType === "TEXT" || o.contentType === "MIXED")
  textContent?: string;

  // Required if contentType is MINDMAP or MIXED
  @Expose()
  @IsOptional()
  @IsUUID()
  @ValidateIf((o) => o.contentType === "MINDMAP" || o.contentType === "MIXED")
  mindmapId?: string;

  // documentUrl is handled via file upload, not DTO
}

 /* 🔍 Pagination query (for future list endpoints)
 */
export class StudentQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}