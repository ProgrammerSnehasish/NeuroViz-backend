import { NextFunction, Request, Response, Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { UserController } from "./user.controller";
import createHttpError from "http-errors";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { UpdateUserDto } from "./user.dto";

export const userRouter = Router();
const userController = new UserController()
userRouter.get("/email/:email",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params["email"]) {
        throw createHttpError("Missing path paramter: email")
      }
      const user = await userController.getUserDetails(req.params["email"])
      req.body = user;
      next()
    } catch (error) {
        next(error)
    }
  }
)
  userRouter.get("/:id",
    verifyToken,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.params["id"]) {
          throw createHttpError("Missing path paramter: id")
        }
        const user = await userController.getUserDetailsById(req.params["id"])
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
  dtoValidation(UpdateUserDto),
  async(req:Request,res:Response,next:NextFunction)=>{
    try{
      const result = await userController.updateUser(req.body, req.body.token.userId)
      req.body = result
      next()
    }catch(err){
      next(err)
    }
  }
)
userRouter.delete(
  "/delete/:userId",
  verifyToken,
  async(req:Request,res:Response,next:NextFunction)=>{
    try{
      if(!req.params["userId"]){
        throw createHttpError("Missing path paramter: userId")
      }
      await userController.deleteUser(req.params["userId"])
      res.status(200).send({success: true, message: "User deleted successfully"})
    }catch(err){
      next(err)
    }
  } 
)