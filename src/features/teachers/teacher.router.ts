import { Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { TeacherController } from "./teacher.controller";
import { dtoValidation } from "../../middlewares/dtoValidation";
import { AddMembersToGroupDto, AddStudentToGroupDto, AssignmentDto, CreateGroupDto, InviteStudentDto, InviteStudentToGroupDto, RegisterStudentDto, ReviewDto, SearchQueryDto, SubmissionDto, UpdateAssignmentDto, UpdateGroupDto } from "./teacher.dto";

const teacherRouter = Router();

/**
 * -----------------------------
 * 📊 ANALYTICS + PERFORMANCE
 * -----------------------------
 */
teacherRouter.get("/student/:userId/analytics",verifyToken,TeacherController.getStudentAnalytics);
teacherRouter.get("/student/:userId/summarize",verifyToken,TeacherController.summarizeStudent);
teacherRouter.post("/mindmap/:mindmapId/review",verifyToken,TeacherController.reviewMindmap);
teacherRouter.get("/class/overview",verifyToken,TeacherController.getClassOverview);

/**
 * -----------------------------
 * 📘 ASSIGNMENTS
 * -----------------------------
 */
teacherRouter.post("/assignment/create",verifyToken,dtoValidation(AssignmentDto),TeacherController.createAssignment);
teacherRouter.get("/get/assignments",verifyToken,TeacherController.getAssignments);
teacherRouter.get("/assignment/:assignmentId",verifyToken,TeacherController.getAssignmentDetails);
teacherRouter.put("/assignment/update/:assignmentId",verifyToken,dtoValidation(UpdateAssignmentDto),TeacherController.updateAssignment);
teacherRouter.delete("/assignment/:assignmentId",verifyToken,TeacherController.deleteAssignment);
teacherRouter.post("/assignment/evaluate",verifyToken,TeacherController.evaluateAssignment);
teacherRouter.post("/assignment/submission/evaluate",verifyToken,dtoValidation(SubmissionDto),TeacherController.evaluateSubmission);

/**
 * -----------------------------
 * 🧠 REVIEW + FEEDBACK
 * -----------------------------
 */
teacherRouter.post("/review",verifyToken,dtoValidation(ReviewDto),TeacherController.reviewSubmission);
teacherRouter.get("/submissions/teacher",verifyToken,TeacherController.getSubmissionsForTeacher);
teacherRouter.get("/submission/:submissionId/regenerate-summary",verifyToken,TeacherController.regenerateSummary);

/**
 * -----------------------------
 * 👩‍🏫 TEACHER → STUDENT MGMT
 * -----------------------------
 */

// 👥 Group
teacherRouter.post("/group/create",verifyToken,dtoValidation(CreateGroupDto),TeacherController.createGroup);

teacherRouter.put("/groups/:groupId", verifyToken,dtoValidation(UpdateGroupDto),TeacherController.updateGroup);

teacherRouter.delete("/groups/:groupId", verifyToken, TeacherController.deleteGroup);

// 🔍 Search students
teacherRouter.get("/students/search",verifyToken,dtoValidation(SearchQueryDto),TeacherController.searchStudents);

// 🧾 Register student (direct add)
teacherRouter.post("/students/register",verifyToken,dtoValidation(RegisterStudentDto),TeacherController.registerStudent);

// ➕ Add multiple students to a group
teacherRouter.post("/group/members/add",verifyToken,dtoValidation(AddMembersToGroupDto),TeacherController.addMembersToGroup);

// ➕ Add single student to a group
teacherRouter.post("/group/student/add",verifyToken,dtoValidation(AddStudentToGroupDto),TeacherController.addStudentToGroup);

// 📩 Invite student by email
teacherRouter.post("/students/invite",verifyToken,dtoValidation(InviteStudentDto),TeacherController.inviteStudent);

// 📩 Invite student to add a specific group by email
teacherRouter.post("/students/invite/group",verifyToken,dtoValidation(InviteStudentToGroupDto),TeacherController.inviteStudentToGroup);

export default teacherRouter;
