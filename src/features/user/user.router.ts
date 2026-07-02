import { NextFunction, Request, Response, Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { UserController } from "./user.controller";
import createHttpError from "http-errors";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { UpdateUserDto } from "./user.dto";
import multer from "multer";
import { upload } from "../../middlewares/upload";

export const userRouter = Router();
const userController = new UserController()

userRouter.get(
  "/email/:email",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const emailParam = req.params["email"];
      if (!emailParam) {
        throw createHttpError(400, "Missing path parameter: email");
      }
      const user = await userController.getUserDetails(emailParam as string);
      if (!user) {
        throw createHttpError(404, "User not found");
      }
      res.status(200).json({
        success: true,
        message: "User details fetched successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

 userRouter.get("/:id",
    verifyToken,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.params["id"]) {
          throw createHttpError("Missing path paramter: id")
        }
        const user = await userController.getUserDetailsById(req.params["id"] as string);
        req.body = user;
        next()
      } catch (error) {
          next(error)
      }
    }
)

userRouter.put(
  "/update",
  verifyToken,
  upload.single("profilePhoto"), // must run before dtoValidation, since it parses multipart form data
  dtoValidation(UpdateUserDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId =
        (req as any).user?.userId ||
        (req as any).user?.id ||
        (req as any).user?.sub;

      if (!userId) {
        throw createHttpError(401, "Unauthorized - Missing user ID in token");
      }

      const fileBuffer = req.file?.buffer;

      const result = await userController.updateUser(req.body, userId, fileBuffer);

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);


userRouter.delete(
  "/delete/:userId",
  verifyToken,
  async(req:Request,res:Response,next:NextFunction)=>{
    try{
      if(!req.params["userId"]){
        throw createHttpError("Missing path paramter: userId")
      }
      await userController.deleteUser(req.params["userId"] as string);
      res.status(200).send({success: true, message: "User deleted successfully"})
    }catch(err){
      next(err)
    }
  } 
)