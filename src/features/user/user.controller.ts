import { UpdateUserDto } from "./user.dto";
import { IUserDetails } from "./user.interface";
import { UserService } from "./user.service";

export class UserController {
  private userService: UserService;
  constructor() {
    this.userService = new UserService();
  }

  public async getUserDetails(email: string): Promise<IUserDetails>{
    //TODO: get user details from user service
    return await this.userService.getUser(email);
  }
  public async getUserDetailsById(id: string): Promise<IUserDetails>{
    return await this.userService.getUserById(id);
  }
  public async updateUser(data:UpdateUserDto, userId: string, fileBuffer?: Buffer):Promise<IUserDetails>{
    return await this.userService.updateUser(data, userId, fileBuffer);
  }
  public async deleteUser(userId: string): Promise<void>{
    return await this.userService.deleteUser(userId);
  }
}