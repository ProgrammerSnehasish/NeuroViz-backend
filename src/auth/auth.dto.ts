import { IsNotEmpty, MinLength, IsEmail, IsDateString, IsEnum } from "class-validator";
import { userRole } from "../config/core";

export class SigninDto {
    @IsNotEmpty()
    @MinLength(8)
    password:string;

    @IsNotEmpty()
    @IsEmail()
    email:string;

    @IsNotEmpty()
    @IsEnum(userRole)
    userRole: userRole;

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
    @IsEnum(userRole)
    userRole: userRole;
  Role: any;
    
}