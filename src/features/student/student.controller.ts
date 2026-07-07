import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { StudentAssignmentService } from "./Services/student.assignment.service";
import { StudentService } from "./student.service";
import { CreateSubmissionDto } from "./student.dto";


// Helper — extracts student ID from the JWT payload (supports multiple field names)
const getId = (req: Request): string =>
  (req.user as any)?.id ??
  (req.user as any)?.userId ??
  (req.user as any)?._id;

export const StudentController = {
  // ─────────────────────────────────────────────
  // ACCOUNT
  // ─────────────────────────────────────────────

  /** POST /student/invite/accept  (public) */
  async acceptInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password, firstName, lastName } = req.body;
      const data = await StudentService.acceptInvite(token, password, firstName, lastName);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /student/me */
  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentService.getMyProfile(getId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /student/my-teachers */
  getMyTeachers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = res.locals.userId;
      const data = await StudentService.getMyTeachers(studentId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────
  // ASSIGNMENTS
  // ─────────────────────────────────────────────

  /** GET /student/assignments */
  async getMyAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentAssignmentService.getMyAssignments(getId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /student/assignment/:assignmentId */
  async getAssignmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { assignmentId } = req.params;
      if (!assignmentId) throw createHttpError(400, "Assignment ID is required.");
      const data = await StudentAssignmentService.getAssignmentById(getId(req), assignmentId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  submitAssignment: async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await StudentAssignmentService.submitAssignment(
      res.locals.studentId,
      req.body,
      req.file ?? undefined, // document file if uploaded
    );
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
},

  /** GET /student/submissions */
  async getMySubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentAssignmentService.getMySubmissions(getId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /student/submission/:submissionId */
  async getSubmissionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { submissionId } = req.params;
      if (!submissionId) throw createHttpError(400, "Submission ID is required.");
      const data = await StudentAssignmentService.getSubmissionById(getId(req), submissionId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────
  // GRADES & FEEDBACK
  // ─────────────────────────────────────────────

  /** GET /student/grades */
  async getMyGrades(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentService.getMyGrades(getId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /student/teacher-feedbacks */
  async getTeacherFeedbacks(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentService.getTeacherFeedbacks(getId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  


  // ─────────────────────────────────────────────
  // GROUPS
  // ─────────────────────────────────────────────

  /** GET /student/groups */
  async getMyGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentService.getMyGroups(getId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** GET /student/group/:groupId */
  async getGroupById(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      if (!groupId) throw createHttpError(400, "Group ID is required.");
      const data = await StudentService.getGroupById(getId(req), groupId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────

  /** GET /student/notifications */
  async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentService.getMyNotifications(getId(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },

  /** PATCH /student/notification/:notificationId/read */
  async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { notificationId } = req.params;
      if (!notificationId) throw createHttpError(400, "Notification ID is required.");
      const data = await StudentService.markNotificationRead(getId(req), notificationId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
};