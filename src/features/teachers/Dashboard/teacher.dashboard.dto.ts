import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  MinLength,
} from "class-validator";

/**
 * 🧾 Submit feedback to a student
 */
export class GiveFeedbackDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: "Feedback must be at least 5 characters long." })
  feedback!: string;
}

// /**
//  * 📬 Mark a notification as read
//  */
// export class MarkNotificationReadDto {
//   @IsUUID()
//   @IsNotEmpty()
//   id!: string;
// }

/**
 * 🔔 Notification response DTO
 */
export class NotificationResponseDto {
  @IsUUID()
  id!: string;

  @IsString()
  message!: string;

  @IsBoolean()
  isRead!: boolean;

  @IsDateString()
  createdAt!: string;
}

/**
 * 📊 Feedback overview response DTO
 */
export class FeedbackOverviewDto {
  @IsUUID()
  studentId!: string;

  @IsString()
  studentName!: string;

  @IsString()
  feedback!: string;

  @IsDateString()
  createdAt!: string;
}

/**
 * 🧠 Notification list response DTO
 */
export class NotificationListDto {
  @IsArray()
  notifications!: NotificationResponseDto[];
}

export class PostNotificationDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  message!: string;
}

export class NotificationIdDto {
  @IsNotEmpty()
  @IsString()
  id!: string;
}