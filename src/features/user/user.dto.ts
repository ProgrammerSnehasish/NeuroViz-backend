import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto{
    @IsOptional()
    @IsString()
    firstName: string;

    @IsOptional()
    @IsString()
    middleName: string;

    @IsOptional()
    @IsString()
    lastName: string;

    @IsOptional()
    @IsString()
    dob: string;

    @IsOptional()
    @IsEmail()
    email:string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    education: string;

    @IsOptional()
    @IsString()
    homeTown: string;

    @IsOptional()
    @IsString()
    currentCity: string;

}