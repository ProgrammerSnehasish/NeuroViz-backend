import { Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { UserController } from "./user.controller";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { UpdateUserDto } from "./user.dto";
import { upload } from "../../middlewares/upload";

export const userRouter = Router();

/** GET /user/email/:email */
userRouter.get(
  "/email/:email",
  verifyToken,
  UserController.getUserByEmail
);

/** GET /user/:id */
userRouter.get(
  "/:id",
  verifyToken,
  UserController.getUserById
);

/** PATCH /user/update */
userRouter.put(
  "/update",
  verifyToken,
  upload.fields([
    { name: "profilePhoto",        maxCount: 1  }, // profile photo
    { name: "certifications", maxCount: 10 }, // certification files (teachers)
  ]),
  dtoValidation(UpdateUserDto),
  UserController.updateUser
);

/** DELETE /user/profile-photo */
userRouter.delete(
  "/profile-photo",
  verifyToken,
  UserController.removeProfilePhoto
);

/** DELETE /user/delete/:userId */
userRouter.delete(
  "/delete/:userId",
  verifyToken,
  UserController.deleteUser
);