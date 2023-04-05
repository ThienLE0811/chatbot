
import { IsEmail, IsNotEmpty,IsString,IsDate } from 'class-validator';


export class UserDto {
    @IsString({})
    userName: string;

    @IsString()
    password: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;
    
    @IsEmail()
    email: string;

    @IsString()
    userRole: {}

    @IsString()
    userRoleName: string

    @IsDate()
    createdAt: Date;

    @IsDate()
    updateAt: Date;
}