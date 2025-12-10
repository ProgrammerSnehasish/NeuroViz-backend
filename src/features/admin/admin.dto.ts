import { IsString, IsBoolean, IsOptional, IsUUID } from "class-validator";

export class UpdateUserStatusDto {
  @IsUUID()
  userId!: string;

  @IsBoolean()
  isActive!: boolean;
}