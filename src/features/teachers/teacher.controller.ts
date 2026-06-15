import { Request, Response, NextFunction } from "express";
import { EvaluationMode } from "../../config/core";
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
  MindmapFilterDto,
  StudentStrategyDto,
} from "./teacher.dto";
import { TeacherDashboardService } from "./Dashboard/teacher.dashboard.service";
import { TeacherAssignmentService } from "./Services/teacher.assignment.service";
import { MailLogService } from "./Services/teacher.mail-log.service";
import { TeacherReviewService } from "./Services/teacher.review.service";
import { TeacherService } from "./Services/teacher.service";
import { TeacherStudentService } from "./Services/teacher.student.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTeacherId = (req: Request): string =>
  (req.user as any)?.id ||
  (req.user as any)?.userId ||
  (req.user as any)?._id;

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

export const TeacherController = {

  /** GET /teacher/students */
  getStudentManagementOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.getStudentManagementOverview(getTeacherId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/search?query= */
  searchStudents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = SearchStudentsDto.parse(req.query);
      const data = await TeacherStudentService.searchStudents(getTeacherId(req), query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/register */
  registerStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentData = RegisterStudentDto.parse(req.body);
      const data = await TeacherStudentService.registerStudent(getTeacherId(req), studentData);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /teacher/students/:studentId/unregister */
  unregisterStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.unregisterStudent(
        getTeacherId(req),
        req.params.studentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/invite */
  inviteStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = InviteStudentDto.parse(req.body);
      const data = await TeacherStudentService.inviteStudent(getTeacherId(req), email);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/:studentId/analytics */
  getStudentAnalytics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherService.getStudentAnalytics(getTeacherId(req), req.params.studentId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/:studentId/summary */
  summarizeStudentPerformance: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherService.summarizeStudentPerformance(getTeacherId(req), req.params.studentId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/:studentId/progress */
  getStudentProgress: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherDashboardService.getStudentProgress(getTeacherId(req), req.params.studentId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GROUP CONTROLLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /** GET /teacher/students/groups */
  getGroups: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.getGroups(getTeacherId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/groups */
  createGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description } = CreateGroupDto.parse(req.body);
      const data = await TeacherStudentService.createGroup(getTeacherId(req), name, description);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /teacher/students/groups/:groupId */
  updateGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updateData = UpdateGroupDto.parse(req.body);
      const data = await TeacherStudentService.updateGroup(getTeacherId(req), req.params.groupId as string, updateData);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /teacher/students/groups/:groupId */
  deleteGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.deleteGroup(getTeacherId(req), req.params.groupId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/groups/:groupId/members */
  addMembersToGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentIds } = AddMembersToGroupDto.parse(req.body);
      const data = await TeacherStudentService.addMembersToGroup(getTeacherId(req), req.params.groupId as string, studentIds);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/groups/:groupId/members/:studentId */
  addStudentToGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.addStudentToGroup(
        getTeacherId(req),
        req.params.groupId as string,
        req.params.studentId as string
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /teacher/students/groups/:groupId/members/:studentId */
  removeStudentFromGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.removeStudentFromGroup(
        getTeacherId(req),
        req.params.groupId as string,
        req.params.studentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/groups/:groupId/invite */
  inviteStudentToGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = InviteStudentToGroupDto.parse(req.body);
      const data = await TeacherStudentService.inviteStudentToGroup(
        getTeacherId(req),
        email,
        req.params.groupId as string
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ASSIGNMENT CONTROLLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /** GET /teacher/assignments */
  getAssignmentManagementOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherAssignmentService.getAssignmentManagementOverview(getTeacherId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/assignments */
  createAssignment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, dueDate, studentIds, groupIds, evaluationMode } =
        CreateAssignmentDto.parse(req.body);
      const data = await TeacherAssignmentService.createAssignment(
        getTeacherId(req),
        title,
        description,
        { studentIds, groupIds, evaluationMode, dueDate }
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/assignments/:assignmentId */
  getAssignmentDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherAssignmentService.getAssignmentDetails(
        getTeacherId(req),
        req.params.assignmentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /teacher/assignments/:assignmentId */
  updateAssignment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updateData = UpdateAssignmentDto.parse(req.body);
      const data = await TeacherAssignmentService.updateAssignment(
        getTeacherId(req),
        req.params.assignmentId as string,
        updateData
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /teacher/assignments/:assignmentId */
  deleteAssignment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherAssignmentService.deleteAssignment(
        getTeacherId(req),
        req.params.assignmentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/assignments/:assignmentId/evaluate/:submissionId */
  evaluateSubmission: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mode, grade, feedback } = EvaluateSubmissionDto.parse(req.body);
      const data = await TeacherAssignmentService.evaluateSubmission(
        getTeacherId(req),
        req.params.submissionId as string,
        mode === "MANUAL" ? EvaluationMode.Manual : EvaluationMode.Auto,
        { grade, feedback }
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/assignments/student/:studentId/submissions */
  getSubmissionsForStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherAssignmentService.getSubmissionsForStudent(
        getTeacherId(req),
        req.params.studentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
  // ─────────────────────────────────────────────────────────────────────────────
  // REVIEW CONTROLLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /** GET /teacher/review/submissions */
  getAllSubmissions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.getSubmissionsForTeacher(getTeacherId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/review/submissions/pending */
  getPendingSubmissions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.getPendingSubmissions(getTeacherId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/review/submissions/:submissionId */
  getSubmissionById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.getSubmissionById(
        getTeacherId(req),
        req.params.submissionId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/review/:submissionId */
  reviewSubmission: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { grade, feedback } = ReviewSubmissionDto.parse(req.body);
      const data = await TeacherReviewService.reviewSubmission(
        getTeacherId(req),
        req.params.submissionId as string,
        grade,
        feedback
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/review/bulk/:assignmentId */
  bulkReviewSubmissions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.bulkReviewSubmissions(
        getTeacherId(req),
        req.params.assignmentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/review/:submissionId/regenerate */
  regenerateSummary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.regenerateSummary(
        getTeacherId(req),
        req.params.submissionId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MINDMAP CONTROLLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /** GET /teacher/mindmaps */
  getMindmapManagementOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = MindmapFilterDto.parse(req.query);
      const data = await TeacherService.getMindmapManagementOverview(getTeacherId(req), filter);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/mindmaps/:mindmapId/review */
  reviewMindmap: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { approval, comment } = ReviewMindmapDto.parse(req.body);
      const data = await TeacherService.reviewMindmap(
        getTeacherId(req),
        req.params.mindmapId as string,
        approval,
        comment
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIL LOG CONTROLLERS
  // ─────────────────────────────────────────────────────────────────────────────
  /** GET /teacher/mail-logs */
  getMailLogs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const data = await MailLogService.getTeacherMailLogs(getTeacherId(req), limit);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/mail-logs/:mailId */
  getMailLogById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await MailLogService.getMailLogById(getTeacherId(req), req.params.mailId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS OVERVIEW CONTROLLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /** GET /teacher/class-overview */
  getClassOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherService.getClassOverview(getTeacherId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};