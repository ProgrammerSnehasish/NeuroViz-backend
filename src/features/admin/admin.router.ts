import { Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { AdminController } from "./admin.controller";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { UpdateUserStatusDto } from "./admin.dto";
import { enforceAdmin } from "../../middlewares/enforceAdmin";

const adminRouter = Router();
adminRouter.use(verifyToken, enforceAdmin);

// Dashboard
adminRouter.get("/overview", AdminController.overview);
adminRouter.get("/health", AdminController.health);
adminRouter.get("/activity/logs", AdminController.activityLogs);

// User Management
adminRouter.get("/users", AdminController.getUsers);
adminRouter.post("/user/status", dtoValidation(UpdateUserStatusDto), AdminController.updateStatus);
adminRouter.delete("/user/:userId", AdminController.deleteUser);
adminRouter.delete("/user/:userId/reset", AdminController.resetUserData);

export default adminRouter;
