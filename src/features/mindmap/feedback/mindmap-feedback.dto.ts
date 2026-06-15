import { IsString, IsOptional, IsInt, Min, Max } from "class-validator";
import { Expose } from "class-transformer";

export class GiveMindmapFeedbackDto {
  @Expose()
  @IsString()
  mapId: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @Expose()
  @IsOptional()
  @IsString()
  comments?: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;
}

export class UpdateMindmapFeedbackDto {
  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @Expose()
  @IsOptional()
  @IsString()
  comments?: string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;
}