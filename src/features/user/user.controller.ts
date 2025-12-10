import { UpdateUserDto } from "./user.dto";
import { IUserDetails } from "./user.interface";
import { UserService } from "./user.service";

export class UserController {
  private userService: UserService;
  constructor() {
    this.userService = new UserService();
  }

  public async getUserDetails(email: string, tokenUserId: string): Promise<IUserDetails>{
    //TODO: get user details from user service
    return await this.userService.getUser(email, tokenUserId);
  }
  public async getUserDetailsById(id: string, tokenUserId: string): Promise<IUserDetails>{
    return await this.userService.getUserById(id, tokenUserId);
  }
  public async updateUser(data:UpdateUserDto, userId: string, tokenUserId: string):Promise<IUserDetails>{
    return await this.userService.updateUser(data, userId, tokenUserId)
  }
  public async deleteUser(userId: string, tokenUserId: string): Promise<void>{
    return await this.userService.deleteUser(userId, tokenUserId);
  }
}