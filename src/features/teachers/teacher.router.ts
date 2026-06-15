import { verifyToken } from "../../middlewares/jwtVerifiction";
import { enforceTeacher } from "../../middlewares/enforceTeacher";
import { Router } from "express";
import { TeacherDashboardController } from "./Dashboard/teacher.dashboard.controller";
import { TeacherController } from "./teacher.controller";

const teacherRouter = Router();

// Apply auth + teacher role guard to every route in this file
teacherRouter.use(verifyToken, enforceTeacher);

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD  ·  /teacher/dashboard
// ─────────────────────────────────────────────────────────────────────────────
teacherRouter.get("/dashboard", TeacherDashboardController.getDashboardOverview);
teacherRouter.get("/dashboard/analytics", TeacherDashboardController.getAnalyticsOverview);
teacherRouter.get("/dashboard/heatmap", TeacherDashboardController.getClassHeatmap);
teacherRouter.get("/dashboard/teaching/insights", TeacherDashboardController.getAdaptiveTeachingInsights);
teacherRouter.get("/dashboard/assignments/insights", TeacherDashboardController.getAssignmentInsights);
teacherRouter.get("/student/compare", TeacherDashboardController.compareStudents);
teacherRouter.get("/class/strategy", TeacherDashboardController.getClassStrategy);
teacherRouter.get("/student/:studentId/strategy", TeacherDashboardController.getStudentStrategy);
teacherRouter.get("/student/:studentId/report", TeacherDashboardController.getStudentReport);
teacherRouter.get("/student/:studentId/progress", TeacherDashboardController.getStudentProgress);

// Notifications
teacherRouter.get("/dashboard/notifications", TeacherDashboardController.getNotifications);
teacherRouter.patch("/dashboard/notifications/read-all", TeacherDashboardController.markAllNotificationsRead);
teacherRouter.patch("/dashboard/notifications/:id/read", TeacherDashboardController.markNotificationRead);
teacherRouter.post("/dashboard/notifications", TeacherDashboardController.postNotification);
teacherRouter.post("/dashboard/broadcast", TeacherDashboardController.broadcastAnnouncement);

// Feedback
teacherRouter.post("/dashboard/feedback", TeacherDashboardController.giveFeedback);
teacherRouter.get("/dashboard/feedback/overview", TeacherDashboardController.getFeedbackOverview);

// ─────────────────────────────────────────────────────────────────────────────
// CLASS OVERVIEW  ·  /teacher/class-overview
// ─────────────────────────────────────────────────────────────────────────────
teacherRouter.get("/class-overview", TeacherController.getClassOverview);
// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS  ·  /teacher/students
// ─────────────────────────────────────────────────────────────────────────────
teacherRouter.get("/students", TeacherController.getStudentManagementOverview);
teacherRouter.get("/students/search", TeacherController.searchStudents);
teacherRouter.post("/students/register", TeacherController.registerStudent);
teacherRouter.delete("/students/:studentId/unregister", TeacherController.unregisterStudent);
teacherRouter.post("/students/invite", TeacherController.inviteStudent);

// Per-student analytics
teacherRouter.get("/students/:studentId/analytics", TeacherController.getStudentAnalytics);
teacherRouter.get("/students/:studentId/summary", TeacherController.summarizeStudentPerformance);
teacherRouter.get("/students/:studentId/progress", TeacherController.getStudentProgress);
teacherRouter.get("/students/:studentId/submissions", TeacherController.getSubmissionsForStudent);

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS  ·  /teacher/students/groups
// ─────────────────────────────────────────────────────────────────────────────
teacherRouter.get("/groups", TeacherController.getGroups);
teacherRouter.post("/group/create", TeacherController.createGroup);
teacherRouter.patch("/group/:groupId", TeacherController.updateGroup);
teacherRouter.delete("/group/:groupId", TeacherController.deleteGroup);
teacherRouter.post("/students/group/:groupId/members/add", TeacherController.addMembersToGroup);
teacherRouter.post("/student/group/:groupId/member/:studentId/add", TeacherController.addStudentToGroup);
teacherRouter.delete("/student/group/:groupId/member/:studentId", TeacherController.removeStudentFromGroup);
teacherRouter.post("/student/group/:groupId/invite", TeacherController.inviteStudentToGroup);

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS  ·  /teacher/assignments
// ─────────────────────────────────────────────────────────────────────────────
teacherRouter.get("/assignments", TeacherController.getAssignmentManagementOverview);
teacherRouter.post("/assignment", TeacherController.createAssignment);
teacherRouter.get("/assignment/:assignmentId", TeacherController.getAssignmentDetails);
teacherRouter.patch("/assignment/:assignmentId", TeacherController.updateAssignment);
teacherRouter.delete("/assignment/:assignmentId", TeacherController.deleteAssignment);
teacherRouter.post("/assignment/:assignmentId/evaluate/:submissionId", TeacherController.evaluateSubmission);

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW  ·  /teacher/review
// ─────────────────────────────────────────────────────────────────────────────
teacherRouter.get("/review/submissions", TeacherController.getAllSubmissions);
teacherRouter.get("/review/submissions/pending", TeacherController.getPendingSubmissions);
teacherRouter.get("/review/submissions/:submissionId", TeacherController.getSubmissionById);
teacherRouter.post("/review/:submissionId", TeacherController.reviewSubmission);
teacherRouter.post("/review/bulk/:assignmentId", TeacherController.bulkReviewSubmissions);
teacherRouter.post("/review/:submissionId/regenerate", TeacherController.regenerateSummary);

// ─────────────────────────────────────────────────────────────────────────────
// MINDMAPS  ·  /teacher/mindmaps
// ─────────────────────────────────────────────────────────────────────────────
teacherRouter.get("/mindmaps", TeacherController.getMindmapManagementOverview);
teacherRouter.post("/mindmap/:mindmapId/review", TeacherController.reviewMindmap);

// ─────────────────────────────────────────────────────────────────────────────
// MAIL LOGS  ·  /teacher/mail-logs
// ─────────────────────────────────────────────────────────────────────────────
teacherRouter.get("/mail-logs", TeacherController.getMailLogs);
teacherRouter.get("/mail-log/:mailId", TeacherController.getMailLogById);

export default teacherRouter;