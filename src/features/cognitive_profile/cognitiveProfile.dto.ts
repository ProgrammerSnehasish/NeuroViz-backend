import { IsNumber, IsOptional, Min, Max } from "class-validator";

export class CognitiveProfileDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  attentionScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  focusDuration?: number; // seconds

  @IsOptional()
  @IsNumber()
  @Min(0)
  interactions?: number;
}
