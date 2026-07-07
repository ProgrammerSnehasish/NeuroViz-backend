import { Request, Response, NextFunction } from "express";
import { EvaluationMode } from "../../config/core";
import {
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
} from "./teacher.dto";
import { TeacherDashboardService } from "./Dashboard/teacher.dashboard.service";
import { TeacherAssignmentService } from "./Services/teacher.assignment.service";
import { MailLogService } from "./Services/teacher.mail-log.service";
import { TeacherReviewService } from "./Services/teacher.review.service";
import { TeacherService } from "./Services/teacher.service";
import { TeacherStudentService } from "./Services/teacher.student.service";
import { TeacherVerificationService } from "./Services/teacher.verification.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ✅ Read from res.locals — set by enforceTeacher / enforceVerifiedTeacher
const getTeacherId = (res: Response): string => res.locals.teacherId;

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export const TeacherController = {

  // ── Verification ───────────────────────────────────────────────────────────

  /** POST /teacher/verification/submit */
  submitForVerification: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherVerificationService.submitForVerification(getTeacherId(res));
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/verification/status */
  getVerificationStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherVerificationService.getVerificationStatus(getTeacherId(res));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Students ───────────────────────────────────────────────────────────────

  /** GET /teacher/my-students */
  getMyStudents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = res.locals.userId;
      const data = await TeacherService.getMyStudents(teacherId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students */
  getStudentManagementOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.getStudentManagementOverview(getTeacherId(res));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/search?query= */
  searchStudents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = SearchStudentsDto.parse(req.query);
      const data = await TeacherStudentService.searchStudents(getTeacherId(res), query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/register */
  registerStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentData = RegisterStudentDto.parse(req.body);
      const data = await TeacherStudentService.registerStudent(getTeacherId(res), studentData);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /teacher/students/:studentId/unregister */
  unregisterStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.unregisterStudent(
        getTeacherId(res),
        req.params.studentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/invite */
  inviteStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = InviteStudentDto.parse(req.body);
      const data = await TeacherStudentService.inviteStudent(getTeacherId(res), email);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/:studentId/analytics */
  getStudentAnalytics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherService.getStudentAnalytics(getTeacherId(res), req.params.studentId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/:studentId/summary */
  summarizeStudentPerformance: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherService.summarizeStudentPerformance(getTeacherId(res), req.params.studentId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/:studentId/progress */
  getStudentProgress: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherDashboardService.getStudentProgress(getTeacherId(res), req.params.studentId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/students/:studentId/submissions */
  getSubmissionsForStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherAssignmentService.getSubmissionsForStudent(
        getTeacherId(res),
        req.params.studentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Groups ─────────────────────────────────────────────────────────────────

  /** GET /teacher/groups */
  getGroups: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.getGroups(getTeacherId(res));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/group/create */
  createGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description } = CreateGroupDto.parse(req.body);
      const data = await TeacherStudentService.createGroup(getTeacherId(res), name, description);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /teacher/group/:groupId */
  updateGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updateData = UpdateGroupDto.parse(req.body);
      const data = await TeacherStudentService.updateGroup(getTeacherId(res), req.params.groupId as string, updateData);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /teacher/group/:groupId */
  deleteGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.deleteGroup(getTeacherId(res), req.params.groupId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/students/group/:groupId/members/add */
  addMembersToGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentIds } = AddMembersToGroupDto.parse(req.body);
      const data = await TeacherStudentService.addMembersToGroup(
        getTeacherId(res),
        req.params.groupId as string,
        studentIds
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/student/group/:groupId/member/:studentId/add */
  addStudentToGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.addStudentToGroup(
        getTeacherId(res),
        req.params.groupId as string,
        req.params.studentId as string
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /teacher/student/group/:groupId/member/:studentId */
  removeStudentFromGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherStudentService.removeStudentFromGroup(
        getTeacherId(res),
        req.params.groupId as string,
        req.params.studentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/student/group/:groupId/invite */
  inviteStudentToGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = InviteStudentToGroupDto.parse(req.body);
      const data = await TeacherStudentService.inviteStudentToGroup(
        getTeacherId(res),
        email,
        req.params.groupId as string
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Assignments ────────────────────────────────────────────────────────────

  /** GET /teacher/assignments */
  getAssignmentManagementOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherAssignmentService.getAssignmentManagementOverview(getTeacherId(res));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/assignment */
  createAssignment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, dueDate, studentIds, groupIds, evaluationMode } =
        CreateAssignmentDto.parse(req.body);
      const data = await TeacherAssignmentService.createAssignment(
        getTeacherId(res),
        title,
        description,
        { studentIds, groupIds, evaluationMode, dueDate }
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/assignment/:assignmentId */
  getAssignmentDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherAssignmentService.getAssignmentDetails(
        getTeacherId(res),
        req.params.assignmentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /teacher/assignment/:assignmentId */
  updateAssignment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updateData = UpdateAssignmentDto.parse(req.body);
      const data = await TeacherAssignmentService.updateAssignment(
        getTeacherId(res),
        req.params.assignmentId as string,
        updateData
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** DELETE /teacher/assignment/:assignmentId */
  deleteAssignment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherAssignmentService.deleteAssignment(
        getTeacherId(res),
        req.params.assignmentId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/assignment/:assignmentId/evaluate/:submissionId */
  evaluateSubmission: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mode, grade, feedback } = EvaluateSubmissionDto.parse(req.body);
      const data = await TeacherAssignmentService.evaluateSubmission(
        getTeacherId(res),
        req.params.submissionId as string,
        mode === "MANUAL" ? EvaluationMode.Manual : EvaluationMode.Auto,
        { grade, feedback }
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Review ─────────────────────────────────────────────────────────────────

  /** GET /teacher/review/submissions */
  getAllSubmissions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.getSubmissionsForTeacher(getTeacherId(res));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/review/submissions/pending */
  getPendingSubmissions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.getPendingSubmissions(getTeacherId(res));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/review/submissions/:submissionId */
  getSubmissionById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.getSubmissionById(
        getTeacherId(res),
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
        getTeacherId(res),
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
        getTeacherId(res),
        req.params.assignmentId as string,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/review/:submissionId/regenerate */
  regenerateSummary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherReviewService.regenerateSummary(
        getTeacherId(res),
        req.params.submissionId as string
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Mindmaps ───────────────────────────────────────────────────────────────

  /** GET /teacher/mindmaps */
  getMindmapManagementOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = MindmapFilterDto.parse(req.query);
      const data = await TeacherService.getMindmapManagementOverview(getTeacherId(res), filter);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** POST /teacher/mindmap/:mindmapId/review */
  reviewMindmap: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { approval, comment } = ReviewMindmapDto.parse(req.body);
      const data = await TeacherService.reviewMindmap(
        getTeacherId(res),
        req.params.mindmapId as string,
        approval,
        comment
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Mail Logs ──────────────────────────────────────────────────────────────

  /** GET /teacher/mail-logs */
  getMailLogs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const data = await MailLogService.getTeacherMailLogs(getTeacherId(res), limit);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /teacher/mail-log/:mailId */
  getMailLogById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await MailLogService.getMailLogById(getTeacherId(res), req.params.mailId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ── Class Overview ─────────────────────────────────────────────────────────

  /** GET /teacher/class-overview */
  getClassOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await TeacherService.getClassOverview(getTeacherId(res));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};