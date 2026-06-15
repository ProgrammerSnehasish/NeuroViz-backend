import { IsEnum, IsString, IsOptional, IsInt, Min, Max, MinLength, MaxLength, IsEmail } from "class-validator";
import { Expose } from "class-transformer";
import { SiteFeedbackType, SiteFeedbackStatus } from "../../config/core";

export class SubmitFeedbackDto {
  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsEnum(SiteFeedbackType)
  type: SiteFeedbackType;

  @Expose()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @Expose()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class UpdateFeedbackStatusDto {
  @Expose()
  @IsEnum(SiteFeedbackStatus)
  status: SiteFeedbackStatus;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}