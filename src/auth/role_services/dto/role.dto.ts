
import { IsEmail, IsNotEmpty,IsString,IsDate } from 'class-validator';


export class RoleDto {
    @IsString({})
    name: string;

    @IsString()
    description: string;

    @IsString()
    permissions: string[];

    @IsString()
    roleAction: {};
    
    @IsString()
    actionName: string

    @IsEmail()
    roleType: string;

    
}