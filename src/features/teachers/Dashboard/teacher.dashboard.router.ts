import { Router } from "express";
import { TeacherDashboardController } from "./teacher.dashboard.controller";
import { verifyToken } from "../../../middlewares/jwtVerifiction";
import { dtoValidation } from "../../../middlewares/dtoValidation";
import { GiveFeedbackDto, PostNotificationDto } from "./teacher.dashboard.dto";

const teacherDashboardRouter = Router();

teacherDashboardRouter.get("/overview", verifyToken, TeacherDashboardController.getDashboardOverview);
teacherDashboardRouter.get("/heatmap", verifyToken, TeacherDashboardController.getClassHeatmap);
teacherDashboardRouter.get("/student/:studentId/progress", verifyToken, TeacherDashboardController.getStudentProgress);
teacherDashboardRouter.get("/student/:studentId/report", verifyToken, TeacherDashboardController.getStudentReport);
teacherDashboardRouter.get("/student/:studentId/strategy", verifyToken, TeacherDashboardController.getStudentStrategy);
teacherDashboardRouter.get("/class/strategy", verifyToken, TeacherDashboardController.getClassStrategy);
teacherDashboardRouter.get("/compare", verifyToken, TeacherDashboardController.compareStudents);
teacherDashboardRouter.get("/insights/teaching", verifyToken, TeacherDashboardController.getAdaptiveTeachingInsights);
teacherDashboardRouter.get("/insights/assignments", verifyToken, TeacherDashboardController.getAssignmentInsights);
teacherDashboardRouter.post("/feedback", verifyToken,dtoValidation(GiveFeedbackDto), TeacherDashboardController.giveFeedback);
teacherDashboardRouter.get("/feedback/overview", verifyToken, TeacherDashboardController.getFeedbackOverview);
teacherDashboardRouter.get("/notifications", verifyToken, TeacherDashboardController.getNotifications);
teacherDashboardRouter.post("/notifications/create",verifyToken,dtoValidation(PostNotificationDto),TeacherDashboardController.postNotification);
teacherDashboardRouter.patch("/notifications/:id/read", verifyToken, TeacherDashboardController.markNotificationRead);

export default teacherDashboardRouter;
