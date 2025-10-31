import { IsString, IsNotEmpty, Length } from "class-validator";

export class TextDto {
  @IsString()
  @Length(5, 10000)
  @IsNotEmpty()
  text!: string;
}
