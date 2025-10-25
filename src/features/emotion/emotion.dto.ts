import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from "class-validator";

export class EmotionDto {
  @IsNotEmpty()
  @IsString()
  emotion!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  intensity?: number;

  @IsOptional()
  meta?: Record<string, unknown>;
}
