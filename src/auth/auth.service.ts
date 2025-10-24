import { compare, hash } from "bcrypt";
import createHttpError from "http-errors";
import { sign } from "jsonwebtoken";
import { IUserDetails } from "../features/user/user.interface";
import { getUserResponse } from "../utils/util";
import { SigninDto, SignupDto } from "./auth.dto";
import prisma from "../config/database";

export class AuthService {
  public constructor() { }

  public async signin(data: SigninDto): Promise<any> {
    const foundUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (!foundUser) {
      throw createHttpError(400, "User with email " + data.email + " does not exist");
    }

    const passwordMatch = await compare(data.password, foundUser.password);
    if (!passwordMatch) {
      throw createHttpError(400, "Invalid password");
    }

    const token = sign(
      { userId: foundUser.id, userEmail: foundUser.email },
      process.env.JWT_SECRET_KEY as string,
      { expiresIn: "1h" }
    );

    const userData = getUserResponse(foundUser);

    return {
      token: token,
      expiry: new Date().getTime() + 60 * 60 * 1000,
      ...userData,
    };
  }

  public async signup(data: SignupDto): Promise<IUserDetails> {
    const foundUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (foundUser) {
      throw createHttpError(400, "User with email " + data.email + " already exists");
    }

    const hashedPassword = await hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        role: data.role,
        password: hashedPassword
      },
    });

    return getUserResponse(newUser);
  }
}
