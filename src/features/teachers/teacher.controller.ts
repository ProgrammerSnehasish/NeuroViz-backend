import { Request, Response, NextFunction } from "express";
import { EvaluationMode }           from "../../config/core";
import {
  PostNotificationDto,
  BroadcastAnnouncementDto,
  GiveFeedbackDto,
  RegisterStudentDto,
  InviteStudentDto,
  SearchStudentsDto,
  CreateGroupDto,
  UpdateGroupDto,
  AddMembersToGroupDto,
  InviteStudentToGroupDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  EvaluateSubmissionDto,
  ReviewSubmissionDto,
  ReviewMindmapDto,
  GenerateMindmapDto,
  MindmapFilterDto,
  StudentStrategyDto,
} from "./teacher.dto";
import { TeacherDashboardService } from "./Dashboard/teacher.dashboard.service";
import { TeacherAssignmentService } from "./Services/teacher.assignment.service";
import { MailLogService } from "./Services/teacher.mail-log.service";
import { TeacherReviewService } from "./Services/teacher.review.service";
import { TeacherService } from "./Services/teacher.service";
import { TeacherStudentService } from "./Services/teacher.student.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Pull authenticated teacher ID from JWT middleware */
const tid = (req: Request): string => req.user!.id;

/** Wrap async handlers so unhandled promise rejections hit the error middleware */
const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /teacher/dashboard */
export const getDashboardOverview = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getDashboardOverview(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/dashboard/analytics */
export const getAnalyticsOverview = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getAnalyticsOverview(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/dashboard/heatmap */
export const getClassHeatmap = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getClassHeatmap(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/dashboard/insights */
export const getAdaptiveTeachingInsights = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getAdaptiveTeachingInsights(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/dashboard/assignment-insights */
export const getAssignmentInsights = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getAssignmentInsights(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/dashboard/compare */
export const compareStudents = wrap(async (req, res) => {
  const data = await TeacherDashboardService.compareStudents(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/dashboard/class-strategy */
export const getClassStrategy = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getClassStrategy(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/dashboard/strategy/:studentId */
export const getStudentStrategy = wrap(async (req, res) => {
  const { studentId } = StudentStrategyDto.pick({ studentId: true }).parse(req.params);
  const data = await TeacherDashboardService.getStudentStrategy(tid(req), studentId);
  res.json({ success: true, data });
});

/** GET /teacher/dashboard/report/:studentId */
export const getStudentReport = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getStudentReport(tid(req), req.params.studentId as string);
  res.json({ success: true, data });
});

// ── Notifications ─────────────────────────────────────────────────────────────

/** GET /teacher/dashboard/notifications */
export const getNotifications = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getNotifications(tid(req));
  res.json({ success: true, data });
});

/** PATCH /teacher/dashboard/notifications/:id/read */
export const markNotificationRead = wrap(async (req, res) => {
  const data = await TeacherDashboardService.markRead(req.params.id as string);
  res.json({ success: true, data });
});

/** PATCH /teacher/dashboard/notifications/read-all */
export const markAllNotificationsRead = wrap(async (req, res) => {
  const data = await TeacherDashboardService.markAllRead(tid(req));
  res.json({ success: true, data });
});

/** POST /teacher/dashboard/notifications */
export const postNotification = wrap(async (req, res) => {
  const { title, message } = PostNotificationDto.parse(req.body);
  const data = await TeacherDashboardService.postNotification(tid(req), title, message);
  res.status(201).json({ success: true, data });
});

/** POST /teacher/dashboard/broadcast */
export const broadcastAnnouncement = wrap(async (req, res) => {
  const { title, message } = BroadcastAnnouncementDto.parse(req.body);
  const data = await TeacherDashboardService.broadcastAnnouncement(tid(req), title, message);
  res.status(201).json({ success: true, data });
});

// ── Feedback ──────────────────────────────────────────────────────────────────

/** POST /teacher/dashboard/feedback */
export const giveFeedback = wrap(async (req, res) => {
  const { studentId, feedback } = GiveFeedbackDto.parse(req.body);
  const data = await TeacherDashboardService.giveFeedback(tid(req), studentId, feedback);
  res.status(201).json({ success: true, data });
});

/** GET /teacher/dashboard/feedback */
export const getFeedbackOverview = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getFeedbackOverview(tid(req));
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /teacher/students */
export const getStudentManagementOverview = wrap(async (req, res) => {
  const data = await TeacherStudentService.getStudentManagementOverview(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/students/search?query= */
export const searchStudents = wrap(async (req, res) => {
  const { query } = SearchStudentsDto.parse(req.query);
  const data = await TeacherStudentService.searchStudents(tid(req), query);
  res.json({ success: true, data });
});

/** POST /teacher/students/register */
export const registerStudent = wrap(async (req, res) => {
  const studentData = RegisterStudentDto.parse(req.body);
  const data = await TeacherStudentService.registerStudent(tid(req), studentData);
  res.status(201).json({ success: true, data });
});

/** POST /teacher/students/invite */
export const inviteStudent = wrap(async (req, res) => {
  const { email } = InviteStudentDto.parse(req.body);
  const data = await TeacherStudentService.inviteStudent(tid(req), email);
  res.status(201).json({ success: true, data });
});

// ── Analytics per student ─────────────────────────────────────────────────────

/** GET /teacher/students/:studentId/analytics */
export const getStudentAnalytics = wrap(async (req, res) => {
  const data = await TeacherService.getStudentAnalytics(tid(req), req.params.studentId as string);
  res.json({ success: true, data });
});

/** GET /teacher/students/:studentId/summary */
export const summarizeStudentPerformance = wrap(async (req, res) => {
  const data = await TeacherService.summarizeStudentPerformance(tid(req), req.params.studentId as string);
  res.json({ success: true, data });
});

/** GET /teacher/students/:studentId/progress */
export const getStudentProgress = wrap(async (req, res) => {
  const data = await TeacherDashboardService.getStudentProgress(tid(req), req.params.studentId as string);
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /teacher/students/groups */
export const getGroups = wrap(async (req, res) => {
  const data = await TeacherStudentService.getGroups(tid(req));
  res.json({ success: true, data });
});

/** POST /teacher/students/groups */
export const createGroup = wrap(async (req, res) => {
  const { name, description } = CreateGroupDto.parse(req.body);
  const data = await TeacherStudentService.createGroup(tid(req), name, description);
  res.status(201).json({ success: true, data });
});

/** PATCH /teacher/students/groups/:groupId */
export const updateGroup = wrap(async (req, res) => {
  const updateData = UpdateGroupDto.parse(req.body);
  const data = await TeacherStudentService.updateGroup(tid(req), req.params.groupId as string, updateData);
  res.json({ success: true, data });
});

/** DELETE /teacher/students/groups/:groupId */
export const deleteGroup = wrap(async (req, res) => {
  const data = await TeacherStudentService.deleteGroup(tid(req), req.params.groupId as string);
  res.json({ success: true, data });
});

/** POST /teacher/students/groups/:groupId/members */
export const addMembersToGroup = wrap(async (req, res) => {
  const { studentIds } = AddMembersToGroupDto.parse(req.body);
  const data = await TeacherStudentService.addMembersToGroup(tid(req), req.params.groupId as string, studentIds);
  res.status(201).json({ success: true, data });
});

/** POST /teacher/students/groups/:groupId/members/:studentId */
export const addStudentToGroup = wrap(async (req, res) => {
  const data = await TeacherStudentService.addStudentToGroup(
    tid(req),
    req.params.groupId as string,
    req.params.studentId as string
  );
  res.status(201).json({ success: true, data });
});

/** DELETE /teacher/students/groups/:groupId/members/:studentId */
export const removeStudentFromGroup = wrap(async (req, res) => {
  const data = await TeacherStudentService.removeStudentFromGroup(
    tid(req),
    req.params.groupId as string,
    req.params.studentId as string
  );
  res.json({ success: true, data });
});

/** POST /teacher/students/groups/:groupId/invite */
export const inviteStudentToGroup = wrap(async (req, res) => {
  const { email } = InviteStudentToGroupDto.parse(req.body);
  const data = await TeacherStudentService.inviteStudentToGroup(
    tid(req),
    email,
    req.params.groupId as string
  );
  res.status(201).json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /teacher/assignments */
export const getAssignmentManagementOverview = wrap(async (req, res) => {
  const data = await TeacherAssignmentService.getAssignmentManagementOverview(tid(req));
  res.json({ success: true, data });
});

/** POST /teacher/assignments */
export const createAssignment = wrap(async (req, res) => {
  const { title, description, dueDate, studentIds, groupIds, evaluationMode } =
    CreateAssignmentDto.parse(req.body);
  const data = await TeacherAssignmentService.createAssignment(
    tid(req),
    title,
    description,
    { studentIds, groupIds, evaluationMode, dueDate }
  );
  res.status(201).json({ success: true, data });
});

/** GET /teacher/assignments/:assignmentId */
export const getAssignmentDetails = wrap(async (req, res) => {
  const data = await TeacherAssignmentService.getAssignmentDetails(
    tid(req),
    req.params.assignmentId as string
  );
  res.json({ success: true, data });
});

/** PATCH /teacher/assignments/:assignmentId */
export const updateAssignment = wrap(async (req, res) => {
  const updateData = UpdateAssignmentDto.parse(req.body);
  const data = await TeacherAssignmentService.updateAssignment(
    tid(req),
    req.params.assignmentId as string,
    updateData
  );
  res.json({ success: true, data });
});

/** DELETE /teacher/assignments/:assignmentId */
export const deleteAssignment = wrap(async (req, res) => {
  const data = await TeacherAssignmentService.deleteAssignment(
    tid(req),
    req.params.assignmentId as string
  );
  res.json({ success: true, data });
});

/** POST /teacher/assignments/:assignmentId/evaluate/:submissionId */
export const evaluateSubmission = wrap(async (req, res) => {
  const { mode, grade, feedback } = EvaluateSubmissionDto.parse(req.body);
  const data = await TeacherAssignmentService.evaluateSubmission(
    tid(req),
    req.params.submissionId as string,
    mode === "MANUAL" ? EvaluationMode.Manual : EvaluationMode.Auto,
    { grade, feedback }
  );
  res.json({ success: true, data });
});

/** GET /teacher/assignments/student/:studentId/submissions */
export const getSubmissionsForStudent = wrap(async (req, res) => {
  const data = await TeacherAssignmentService.getSubmissionsForStudent(
    tid(req),
    req.params.studentId as string
  );
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /teacher/review/submissions */
export const getAllSubmissions = wrap(async (req, res) => {
  const data = await TeacherReviewService.getSubmissionsForTeacher(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/review/submissions/pending */
export const getPendingSubmissions = wrap(async (req, res) => {
  const data = await TeacherReviewService.getPendingSubmissions(tid(req));
  res.json({ success: true, data });
});

/** GET /teacher/review/submissions/:submissionId */
export const getSubmissionById = wrap(async (req, res) => {
  const data = await TeacherReviewService.getSubmissionById(
    tid(req),
    req.params.submissionId as string
  );
  res.json({ success: true, data });
});

/** POST /teacher/review/:submissionId */
export const reviewSubmission = wrap(async (req, res) => {
  const { grade, feedback } = ReviewSubmissionDto.parse(req.body);
  const data = await TeacherReviewService.reviewSubmission(
    tid(req),
    req.params.submissionId as string,
    grade,
    feedback
  );
  res.json({ success: true, data });
});

/** POST /teacher/review/bulk/:assignmentId */
export const bulkReviewSubmissions = wrap(async (req, res) => {
  const data = await TeacherReviewService.bulkReviewSubmissions(
    tid(req),
    req.params.assignmentId as string
  );
  res.json({ success: true, data });
});

/** POST /teacher/review/:submissionId/regenerate */
export const regenerateSummary = wrap(async (req, res) => {
  const data = await TeacherReviewService.regenerateSummary(
    tid(req),
    req.params.submissionId as string
  );
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// MINDMAP CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /teacher/mindmaps */
export const getMindmapManagementOverview = wrap(async (req, res) => {
  const filter = MindmapFilterDto.parse(req.query);
  const data = await TeacherService.getMindmapManagementOverview(tid(req), filter);
  res.json({ success: true, data });
});

/** POST /teacher/mindmaps/:mindmapId/review */
export const reviewMindmap = wrap(async (req, res) => {
  const { approval, comment } = ReviewMindmapDto.parse(req.body);
  const data = await TeacherService.reviewMindmap(
    tid(req),
    req.params.mindmapId as string,
    approval,
    comment
  );
  res.json({ success: true, data });
});

/** POST /teacher/mindmaps/generate */
// export const generateMindmap = wrap(async (req, res) => {
//   const { studentId, topic } = GenerateMindmapDto.parse(req.body);
//   const data = await TeacherService.generateMindmap(tid(req), studentId, topic);
//   res.status(201).json({ success: true, data });
// });

// ─────────────────────────────────────────────────────────────────────────────
// MAIL LOG CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /teacher/mail-logs */
export const getMailLogs = wrap(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const data = await MailLogService.getTeacherMailLogs(tid(req), limit);
  res.json({ success: true, data });
});

/** GET /teacher/mail-logs/:mailId */
export const getMailLogById = wrap(async (req, res) => {
  const data = await MailLogService.getMailLogById(tid(req), req.params.mailId as string);
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLASS OVERVIEW CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /teacher/class-overview */
export const getClassOverview = wrap(async (req, res) => {
  const data = await TeacherService.getClassOverview(tid(req));
  res.json({ success: true, data });
});