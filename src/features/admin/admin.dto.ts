import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  MinLength,
} from "class-validator";
import { Expose } from "class-transformer";
import { SiteFeedbackStatus } from "@prisma/client";

export enum AdminUserRole {
  ADMIN   = "ADMIN",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
}

export class UpdateUserStatusDto {
  @Expose()
  @IsUUID()
  userId: string;

  @Expose()
  @IsBoolean()
  isActive: boolean;
}

export class GetUsersFilterDto {
  @Expose()
  @IsOptional()
  @IsEnum(AdminUserRole)
  role?: AdminUserRole;

  @Expose()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  search?: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class GetActivityLogsFilterDto {
  @Expose()
  @IsOptional()
  @IsString()
  userId?: string;

  @Expose()
  @IsOptional()
  @IsString()
  action?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  from?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  to?: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class UpdateFeedbackStatusDto {
  @Expose()
  @IsEnum(SiteFeedbackStatus)
  status: SiteFeedbackStatus;

  @Expose()
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class BroadcastNotificationDto {
  @Expose()
  @IsString()
  @MinLength(3)
  title: string;

  @Expose()
  @IsString()
  @MinLength(5)
  message: string;

  @Expose()
  @IsOptional()
  @IsEnum(AdminUserRole)
  targetRole?: AdminUserRole; // if omitted, sends to all users
}

export class ReviewVerificationDto {
  @Expose()
  @IsEnum(["APPROVED", "REJECTED"])
  decision: "APPROVED" | "REJECTED";

  @Expose()
  @IsOptional()
  @IsString()
  adminNote?: string;
}