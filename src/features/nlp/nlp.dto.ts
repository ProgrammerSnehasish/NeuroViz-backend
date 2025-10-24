import { IsString, IsNotEmpty } from "class-validator";

export class TextDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}
