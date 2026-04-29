import { Role } from "@prisma/client";
import { IsNotEmpty, MinLength, IsEmail, IsEnum, IsString, Length } from "class-validator";


export class SigninDto {
    @IsNotEmpty()
    @MinLength(8)
    password:string;

    @IsNotEmpty()
    @IsEmail()
    email:string;

    @IsNotEmpty()
    @IsEnum(Role)
    role: Role;

}
export class SignupDto{
    @IsEmail()
    @IsNotEmpty()
    email:string;
     
    @IsNotEmpty()
    @MinLength(8)
    password:string;

    @IsNotEmpty()
    firstName: string

    middleName: string;

    @IsNotEmpty()
    lastName: string
    
    @IsNotEmpty()
    @IsEnum(Role)
    role: Role;
    
}

export class GoogleAuthDto {
    @IsNotEmpty()
    @IsString()
    idToken: string;

    @IsNotEmpty()
    @IsEnum(Role)
    role: Role;
}

export class OtpRequestDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}

export class OtpVerifyDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(6, 6)
  @IsString()
  otp: string;
}

export class OtpLoginRequestDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}

export class OtpLoginVerifyDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(6, 6)
  @IsString()
  otp: string;
}

export class ForgotPasswordRequestDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ForgotPasswordVerifyOtpDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(6, 6)
  @IsString()
  otp: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(6, 6)
  @IsString()
  otp: string;                // re-verified on final step for security

  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}