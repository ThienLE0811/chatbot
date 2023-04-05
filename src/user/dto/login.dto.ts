
import { IsNumber, IsString} from 'class-validator';


export class LoginDto {
    @IsString()
    userName: string;

    @IsString()
    password: string;

    

}