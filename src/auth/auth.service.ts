import { compare, hash } from "bcrypt";
import createHttpError from "http-errors";
import { sign } from "jsonwebtoken";
import { IUserDetails } from "../features/user/user.interface";
import { getUserResponse } from "../utils/util";
import { SigninDto, SignupDto } from "./auth.dto";
import prisma from "../config/database";
import { runAdaptationForUser } from "../features/adapt/adapt.service";
import { get } from "http";
import getUserIncludeByRole from "../utils/getUserDetailsbyRole";

export class AuthService {
  public constructor() { }

  public async signin(data: SigninDto): Promise<any> {
    const foundUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!foundUser) {
      // 🔥 Log failed login
      await prisma.activityLog.create({
        data: {
          userId: "System",
          action: "SIGNIN_FAILED",
          details: `Login failed: User not found for email ${data.email}`,
        },
      });

      throw createHttpError(400, `User with email ${data.email} does not exist`);
    }

    const passwordMatch = await compare(data.password, foundUser.password);
    if (!passwordMatch) {

      await prisma.activityLog.create({
        data: {
          userId: foundUser.id,
          action: "PASSWORD_MISMATCH",
          details: `Incorrect password attempt for ${foundUser.email}`,
        },
      });

      throw createHttpError(400, "Invalid password");
    }

    if (data.role && data.role !== foundUser.role) {

      await prisma.activityLog.create({
        data: {
          userId: foundUser.id,
          action: "WRONG_ROLE_LOGIN_ATTEMPT",
          details: `Attempted login as ${data.role}, actual role is ${foundUser.role}`,
        },
      });

      throw createHttpError(
        403,
        `This account is registered as a ${foundUser.role}, not as ${data.role}`
      );
    }

    const token = sign(
      {
        userId: foundUser.id,
        userEmail: foundUser.email,
        role: foundUser.role,
      },
      process.env.JWT_SECRET_KEY as string,
      { expiresIn: "1h" }
    );

    runAdaptationForUser(foundUser.id)
      .then((result) => console.log("Adaptation run on login:", result))
      .catch((err) => console.error("Adaptation failed:", err));

    const fullUserDetails = await prisma.user.findUnique({
      where: { id: foundUser.id },
      include: getUserIncludeByRole(foundUser.role),
      // {
      //   studentProfile: true,
      //   teacherProfile: true,
      //   cognitive: true,
      //   mindmaps: true,
      // },
    });

    if (!fullUserDetails) {
      throw createHttpError(404, "User data could not be retrieved after login");
    }

    const { password, ...sanitizedUser } = fullUserDetails as any;

    if (sanitizedUser.role === "TEACHER") {
      delete sanitizedUser.studentProfile;
    } else {
      delete sanitizedUser.teacherProfile;
    }

    // 🟢 Log successful login
    await prisma.activityLog.create({
      data: {
        userId: foundUser.id,
        action: "SIGNIN_SUCCESS",
        details: `User logged in successfully`,
      },
    });

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        expiry: Date.now() + 60 * 60 * 1000,
        user: sanitizedUser,
      },
    };
  }

  public async signup(data: SignupDto): Promise<IUserDetails> {
    const foundUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (foundUser) {
      await prisma.activityLog.create({
        data: {
          userId: foundUser?.id || "System",
          action: "SIGNUP_FAILED",
          details: `Signup failed: Email ${data.email} already registered`,
        },
      });
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
        password: hashedPassword,
        preferences: {}
      },
    });

    await prisma.activityLog.create({
        data: {
          userId: newUser?.id || "SYSTEM",
          action: "SIGNUP_SUCCESS",
          details: `User signed up successfully with email ${data.email}`,
        },
    });

    return getUserResponse(newUser);
  }
}
