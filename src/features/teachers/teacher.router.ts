import { Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { TeacherController } from "./teacher.controller";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { AddMembersToGroupDto, AddStudentToGroupDto, AssignmentDto, CreateGroupDto, InviteStudentDto, InviteStudentToGroupDto, RegisterStudentDto, ReviewDto, SearchQueryDto, SubmissionDto, UpdateAssignmentDto, UpdateGroupDto } from "./teacher.dto";
import { enforceTeacher } from "../../middlewares/enforceTeacher";

const teacherRouter = Router();
teacherRouter.use(verifyToken, enforceTeacher);

/**
 * -----------------------------
 * 📊 ANALYTICS + PERFORMANCE
 * -----------------------------
 */
teacherRouter.get("/student/:userId/analytics", TeacherController.getStudentAnalytics);
teacherRouter.get("/student/:userId/summarize", TeacherController.summarizeStudent);
teacherRouter.post("/mindmap/:mindmapId/review", TeacherController.reviewMindmap);
teacherRouter.get("/class/overview", TeacherController.getClassOverview);

/**
 * -----------------------------
 * 📘 ASSIGNMENTS
 * -----------------------------
 */
teacherRouter.post("/assignment/create", dtoValidation(AssignmentDto), TeacherController.createAssignment);
teacherRouter.get("/get/assignments", TeacherController.getAssignments);
teacherRouter.get("/assignment/:assignmentId", TeacherController.getAssignmentDetails);
teacherRouter.put("/assignment/update/:assignmentId", dtoValidation(UpdateAssignmentDto), TeacherController.updateAssignment);
teacherRouter.delete("/assignment/:assignmentId", TeacherController.deleteAssignment);
teacherRouter.post("/assignment/evaluate", TeacherController.evaluateAssignment);
teacherRouter.post("/assignment/submission/evaluate", dtoValidation(SubmissionDto), TeacherController.evaluateSubmission);

/**
 * -----------------------------
 * 🧠 REVIEW + FEEDBACK
 * -----------------------------
 */
teacherRouter.post("/review", dtoValidation(ReviewDto), TeacherController.reviewSubmission);
teacherRouter.get("/submissions/teacher", TeacherController.getSubmissionsForTeacher);
teacherRouter.get("/submission/:submissionId/regenerate-summary", TeacherController.regenerateSummary);

/**
 * -----------------------------
 * 👩‍🏫 TEACHER → STUDENT MGMT
 * -----------------------------
 */

// Group
teacherRouter.post("/group/create", dtoValidation(CreateGroupDto), TeacherController.createGroup);

teacherRouter.put("/groups/:groupId", dtoValidation(UpdateGroupDto), TeacherController.updateGroup);

teacherRouter.delete("/groups/:groupId", TeacherController.deleteGroup);

// Search students
teacherRouter.get("/students/search", dtoValidation(SearchQueryDto), TeacherController.searchStudents);

// Register student (direct add)
teacherRouter.post("/students/register", dtoValidation(RegisterStudentDto), TeacherController.registerStudent);

// Add multiple students to a group
teacherRouter.post("/group/members/add", dtoValidation(AddMembersToGroupDto), TeacherController.addMembersToGroup);

// Add single student to a group
teacherRouter.post("/group/student/add", dtoValidation(AddStudentToGroupDto), TeacherController.addStudentToGroup);

// Remove student from group
teacherRouter.post("/group/:groupId/student/:studentId/remove", TeacherController.removeStudentFromGroup);

// Invite student by email
teacherRouter.post("/students/invite", dtoValidation(InviteStudentDto), TeacherController.inviteStudent);

// Invite student to add a specific group by email
teacherRouter.post("/students/invite/group", dtoValidation(InviteStudentToGroupDto), TeacherController.inviteStudentToGroup);

//Mail Logs
teacherRouter.get("/mail/logs", TeacherController.getTeacherMailLogs);
teacherRouter.get("/mail/log/:id", TeacherController.getMailLogById);

export default teacherRouter;

