import { IUserDetails } from "../features/user/user.interface";
import { SigninDto, SignupDto } from "./auth.dto";
import { AuthService } from "./auth.service";


export class AuthController {
    private authService: AuthService;
    public constructor() {
        this.authService = new AuthService();
    }
    public async signin(data: SigninDto): Promise<string>{
        return await this.authService.signin(data)
    }
    public async signup(data: SignupDto): Promise<IUserDetails>{
        return await this.authService.signup(data)
    }
}   