import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateMindmapDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  structure: Record<string, any>; // could be JSON string or node structure

  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class UpdateMindmapDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  structure?: Record<string, any>;
}
