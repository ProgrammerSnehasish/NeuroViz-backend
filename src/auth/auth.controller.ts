import { IUserDetails } from "../features/user/user.interface";
import { ForgotPasswordRequestDto, ForgotPasswordVerifyOtpDto, GoogleAuthDto, OtpLoginRequestDto, OtpLoginVerifyDto, ResetPasswordDto, SigninDto, SignupDto } from "./auth.dto";
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

    public async requestLoginOtp(data: OtpLoginRequestDto): Promise<any> {
        return this.authService.requestLoginOtp(data);
    }

    public async verifyLoginOtp(data: OtpLoginVerifyDto): Promise<any> {
        return this.authService.verifyLoginOtp(data);
    }

    
    public async requestPasswordReset(data: ForgotPasswordRequestDto): Promise<any> {
        return this.authService.requestPasswordReset(data);
    }

    public async verifyPasswordResetOtp(data: ForgotPasswordVerifyOtpDto): Promise<any> {
        return this.authService.verifyPasswordResetOtp(data);
    }

    public async resetPassword(data: ResetPasswordDto): Promise<any> {
        return this.authService.resetPassword(data);
    }

    public async googleAuth(data: GoogleAuthDto): Promise<any> {
        return this.authService.googleAuth(data);
    }

    public async signout(token: string, userId: string): Promise<any> {
        return this.authService.signout(token, userId);
    }
}
 