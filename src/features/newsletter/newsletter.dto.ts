import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ArrayNotEmpty,
} from "class-validator";
import { Expose } from "class-transformer";

export class CreateNewsletterDto {
  @Expose()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @Expose()
  @IsString()
  @MinLength(10)
  content: string;
}

export class UpdateNewsletterDto {
  @Expose()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;
}

export class SubscribeNewsletterDto {
  @Expose()
  @IsEmail()
  email: string;
}

export class UnsubscribeNewsletterDto {
  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsOptional()
  @IsString()
  token?: string;
}

export class SendNewsletterDto {
  @Expose()
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emails?: string[]; // if empty, sends to all active subscribers
}