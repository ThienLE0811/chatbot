
import { IsEmail, IsNotEmpty,IsString,IsDate } from 'class-validator';


export class RoleDto {
    @IsString({})
    username: string;

    @IsString()
    password: string;

    @IsString()
    firstname: string;

    @IsString()
    lastname: string;
    
    @IsEmail()
    email: string;

    @IsString()
    userRole: string;

    @IsDate()
    createdAt: Date;

    @IsDate()
    updateAt: Date;
}