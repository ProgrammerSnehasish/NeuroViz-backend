import { IsOptional, IsInt, IsString, Min, Max } from "class-validator";

export class FeedbackDto {
  @IsOptional()
  @IsString()
  mapId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsInt()
  timeSpent?: number;
}
