import { Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { enforceStudent } from "../../middlewares/enforceStudent";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { StudentController } from "./student.controller";
import { AcceptInviteDto, CreateSubmissionDto } from "./student.dto";
import { upload } from "../../middlewares/upload";

const studentRouter = Router();

/**
 * ─────────────────────────────────────────────
 * PUBLIC — no JWT required
 * ─────────────────────────────────────────────
 */
studentRouter.post(
  "/invite/accept",
  dtoValidation(AcceptInviteDto),
  StudentController.acceptInvite
);

/**
 * ─────────────────────────────────────────────
 * PROTECTED — JWT + Student role required
 * ─────────────────────────────────────────────
 */
studentRouter.use(verifyToken, enforceStudent);

// ── Profile ────────────────────────────────────────────────────────────────
studentRouter.get("/me", StudentController.getMyProfile);

// ── Assignments ────────────────────────────────────────────────────────────
studentRouter.get("/assignments", StudentController.getMyAssignments);
studentRouter.get(
  "/assignment/:assignmentId",
  StudentController.getAssignmentById
);
studentRouter.post(
  "/assignment/submit",
  verifyToken,
  enforceStudent,
  dtoValidation(CreateSubmissionDto),
  upload.single("document"), // optional — only for DOCUMENT type
  StudentController.submitAssignment
);

// ── Submissions ────────────────────────────────────────────────────────────
studentRouter.get("/submissions", StudentController.getMySubmissions);
studentRouter.get(
  "/submission/:submissionId",
  StudentController.getSubmissionById
);

// ── Grades & Teacher Feedback ──────────────────────────────────────────────
studentRouter.get("/grades", StudentController.getMyGrades);
studentRouter.get("/teacher-feedbacks", StudentController.getTeacherFeedbacks);

// ── Groups ─────────────────────────────────────────────────────────────────
studentRouter.get("/groups", StudentController.getMyGroups);
studentRouter.get("/group/:groupId", StudentController.getGroupById);

// ── Notifications ──────────────────────────────────────────────────────────
studentRouter.get("/notifications", StudentController.getMyNotifications);
studentRouter.patch(
  "/notification/:notificationId/read",
  StudentController.markNotificationRead
);

export default studentRouter;