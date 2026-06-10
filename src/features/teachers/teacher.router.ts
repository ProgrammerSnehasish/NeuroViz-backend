import { Router } from "express";
import {
  // Dashboard
  getDashboardOverview,
  getAnalyticsOverview,
  getClassHeatmap,
  getAdaptiveTeachingInsights,
  getAssignmentInsights,
  compareStudents,
  getClassStrategy,
  getStudentStrategy,
  getStudentReport,
  // Notifications
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  postNotification,
  broadcastAnnouncement,
  // Feedback
  giveFeedback,
  getFeedbackOverview,
  // Students
  getStudentManagementOverview,
  searchStudents,
  registerStudent,
  inviteStudent,
  getStudentAnalytics,
  summarizeStudentPerformance,
  getStudentProgress,
  // Groups
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addMembersToGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  inviteStudentToGroup,
  // Assignments
  getAssignmentManagementOverview,
  createAssignment,
  getAssignmentDetails,
  updateAssignment,
  deleteAssignment,
  evaluateSubmission,
  getSubmissionsForStudent,
  // Review
  getAllSubmissions,
  getPendingSubmissions,
  getSubmissionById,
  reviewSubmission,
  bulkReviewSubmissions,
  regenerateSummary,
  // Mindmaps
  getMindmapManagementOverview,
  reviewMindmap,
  // Mail logs
  getMailLogs,
  getMailLogById,
  // Class
  getClassOverview,
} from "./teacher.controller";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { enforceTeacher } from "../../middlewares/enforceTeacher";

const router = Router();

// Apply auth + teacher role guard to every route in this file
router.use(verifyToken, enforceTeacher);

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD  ·  /teacher/dashboard
// ─────────────────────────────────────────────────────────────────────────────
router.get("/dashboard",                          getDashboardOverview);
router.get("/dashboard/analytics",                getAnalyticsOverview);
router.get("/dashboard/heatmap",                  getClassHeatmap);
router.get("/dashboard/insights",                 getAdaptiveTeachingInsights);
router.get("/dashboard/assignment-insights",      getAssignmentInsights);
router.get("/dashboard/compare",                  compareStudents);
router.get("/dashboard/class-strategy",           getClassStrategy);
router.get("/dashboard/strategy/:studentId",      getStudentStrategy);
router.get("/dashboard/report/:studentId",        getStudentReport);

// Notifications
router.get("/dashboard/notifications",            getNotifications);
router.patch("/dashboard/notifications/read-all", markAllNotificationsRead);
router.patch("/dashboard/notifications/:id/read", markNotificationRead);
router.post("/dashboard/notifications",           postNotification);
router.post("/dashboard/broadcast",               broadcastAnnouncement);

// Feedback
router.post("/dashboard/feedback",                giveFeedback);
router.get("/dashboard/feedback",                 getFeedbackOverview);

// ─────────────────────────────────────────────────────────────────────────────
// CLASS OVERVIEW  ·  /teacher/class-overview
// ─────────────────────────────────────────────────────────────────────────────
router.get("/class-overview", getClassOverview);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS  ·  /teacher/students
// ─────────────────────────────────────────────────────────────────────────────
router.get("/students",          getStudentManagementOverview);
router.get("/students/search",   searchStudents);
router.post("/students/register", registerStudent);
router.post("/students/invite",   inviteStudent);

// Per-student analytics
router.get("/students/:studentId/analytics", getStudentAnalytics);
router.get("/students/:studentId/summary",   summarizeStudentPerformance);
router.get("/students/:studentId/progress",  getStudentProgress);
router.get("/students/:studentId/submissions", getSubmissionsForStudent);

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS  ·  /teacher/students/groups
// ─────────────────────────────────────────────────────────────────────────────
router.get("/students/groups",                                    getGroups);
router.post("/students/groups",                                   createGroup);
router.patch("/students/groups/:groupId",                         updateGroup);
router.delete("/students/groups/:groupId",                        deleteGroup);
router.post("/students/groups/:groupId/members",                  addMembersToGroup);
router.post("/students/groups/:groupId/members/:studentId",       addStudentToGroup);
router.delete("/students/groups/:groupId/members/:studentId",     removeStudentFromGroup);
router.post("/students/groups/:groupId/invite",                   inviteStudentToGroup);

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS  ·  /teacher/assignments
// ─────────────────────────────────────────────────────────────────────────────
router.get("/assignments",                                        getAssignmentManagementOverview);
router.post("/assignments",                                       createAssignment);
router.get("/assignments/:assignmentId",                          getAssignmentDetails);
router.patch("/assignments/:assignmentId",                        updateAssignment);
router.delete("/assignments/:assignmentId",                       deleteAssignment);
router.post("/assignments/:assignmentId/evaluate/:submissionId",  evaluateSubmission);

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW  ·  /teacher/review
// ─────────────────────────────────────────────────────────────────────────────
router.get("/review/submissions",                   getAllSubmissions);
router.get("/review/submissions/pending",           getPendingSubmissions);
router.get("/review/submissions/:submissionId",     getSubmissionById);
router.post("/review/:submissionId",                reviewSubmission);
router.post("/review/bulk/:assignmentId",           bulkReviewSubmissions);
router.post("/review/:submissionId/regenerate",     regenerateSummary);

// ─────────────────────────────────────────────────────────────────────────────
// MINDMAPS  ·  /teacher/mindmaps
// ─────────────────────────────────────────────────────────────────────────────
router.get("/mindmaps",                      getMindmapManagementOverview);
// router.post("/mindmaps/generate",            generateMindmap);
router.post("/mindmaps/:mindmapId/review",   reviewMindmap);

// ─────────────────────────────────────────────────────────────────────────────
// MAIL LOGS  ·  /teacher/mail-logs
// ─────────────────────────────────────────────────────────────────────────────
router.get("/mail-logs",          getMailLogs);
router.get("/mail-logs/:mailId",  getMailLogById);

export default router;