
import { IsNumber, IsString} from 'class-validator';


export class LoginDto {
    @IsString()
    username: string;

    @IsString()
    password: string;

    

}