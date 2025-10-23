import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMindmapDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  structure: string; // could be JSON string or node structure

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

  @IsString()
  @IsOptional()
  structure?: string;
}
