
import { IsEmail, IsNotEmpty,IsString,IsDate } from 'class-validator';


export class PermissionDto {
    @IsString()
    module: string;

    @IsString()
    module_name: string;

    @IsString()
    actions: [];

    @IsDate()
    createdAt: Date;

    @IsDate()
    updateAt: Date;
}