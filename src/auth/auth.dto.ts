import { Role } from "@prisma/client";
import { IsNotEmpty, MinLength, IsEmail, IsEnum } from "class-validator";


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