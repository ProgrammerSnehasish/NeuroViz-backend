import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { TeacherAssignmentService } from "./Services/teacher.assignment.service";
import { TeacherService } from "./Services/teacher.service";
import { TeacherReviewService } from "./Services/teacher.review.service";
import { TeacherStudentService } from "./Services/teacher.student.service";
import { MailLogService } from "./Services/teacher.mail-log.service";

export const TeacherController = {
  // ------------------------------
  // 📊 ANALYTICS + PERFORMANCE
  // ------------------------------
  async getStudentAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { userId: studentId } = req.params;

      if (!studentId) throw createHttpError(400, "Student ID is required.");

      const data = await TeacherService.getStudentAnalytics(teacherId, studentId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async summarizeStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { userId: studentId } = req.params;

      if (!studentId) throw createHttpError(400, "Student ID is required.");

      const data = await TeacherService.summarizeStudentPerformance(
        teacherId,
        studentId as string
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async reviewMindmap(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { mindmapId } = req.params;
      let { approval, comment } = req.body;

      if (!mindmapId) throw createHttpError(400, "Mindmap ID is required.");

      if (typeof approval === "string") {
        approval = approval.toLowerCase() === "true";
      }

      const updated = await TeacherService.reviewMindmap(
        teacherId,
        mindmapId as string,
        approval,
        comment
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async getClassOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const data = await TeacherService.getClassOverview(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ------------------------------
  // 📘 ASSIGNMENTS
  // ------------------------------
  async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { title, description, studentIds, groupIds, evaluationMode } = req.body;

      if (!title)
        throw createHttpError(400, "Assignment title is required.");
      if ((!studentIds || !studentIds.length) && (!groupIds || !groupIds.length))
        throw createHttpError(
          400,
          "You must assign to at least one student or group."
        );

      const data = await TeacherAssignmentService.createAssignment(
        teacherId,
        title,
        description,
        { studentIds, groupIds, evaluationMode }
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const data = await TeacherAssignmentService.getAssignmentsByTeacher(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getAssignmentDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { assignmentId } = req.params;

      if (!assignmentId)
        throw createHttpError(400, "Assignment ID is required.");

      const data = await TeacherAssignmentService.getAssignmentDetails(
        teacherId,
        assignmentId as string
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async evaluateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const { text, mode } = req.body;
      if (!text) throw createHttpError(400, "Assignment text is required.");

      const result = await TeacherAssignmentService.evaluateAssignment(
        text,
        mode || "AUTO"
      );

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async evaluateSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;

      const { submissionId, mode, grade, feedback } = req.body;

      if (!submissionId)
        throw createHttpError(400, "Submission ID is required.");

      const data = await TeacherAssignmentService.evaluateSubmission(
        teacherId,
        submissionId,
        mode || "AUTO",
        { grade, feedback } // pass manual inputs
      );

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { assignmentId } = req.params;
      const { title, description, studentIds, groupIds, evaluationMode } = req.body;

      const result = await TeacherAssignmentService.updateAssignment(
        teacherId,
        assignmentId as string,
        { title, description, studentIds, groupIds, evaluationMode }
      );

      res.json({success: true, result});
    } catch (error) {
      next(error);
    }
  },

   async deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id; // assume added by verifyToken
      const { assignmentId } = req.params;

      if (!teacherId || !assignmentId) {
        res.status(400).json({ success: false, message: "Missing teacherId or assignmentId." });
        return;
      }

      const result = await TeacherAssignmentService.deleteAssignment(teacherId, assignmentId as string);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  // ------------------------------
  // 🧠 REVIEW + FEEDBACK
  // ------------------------------
  async reviewSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { submissionId, grade, feedback } = req.body;

      if (!submissionId || grade === undefined)
        throw createHttpError(400, "Submission ID and grade are required.");

      const data = await TeacherReviewService.reviewSubmission(
        teacherId,
        submissionId,
        grade,
        feedback
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getSubmissionsForTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;

      const data = await TeacherReviewService.getSubmissionsForTeacher(teacherId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async regenerateSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { submissionId } = req.params;

      if (!submissionId)
        throw createHttpError(400, "Submission ID is required.");

      const data = await TeacherReviewService.regenerateSummary(
        teacherId,
        submissionId as string
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // --------------------------------
  // Teacher Services for Student
  // --------------------------------
  createGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { name, description } = req.body;

      if (!name) throw createHttpError(400, "Group name is required.");
      const group = await TeacherStudentService.createGroup(teacherId, name, description);

      res.status(201).json({ success: true, data: group });
    } catch (err) {
      next(err);
    }
  },

  updateGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;

      const { groupId } = req.params;
      const { name, description } = req.body;

      if (!groupId)
        throw createHttpError(400, "Group ID is required.");

      const data = await TeacherStudentService.updateGroup(teacherId, groupId as string, {
        name,
        description,
      });

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  deleteGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;

      const { groupId } = req.params;

      if (!groupId)
        throw createHttpError(400, "Group ID is required.");

      const result = await TeacherStudentService.deleteGroup(teacherId, groupId as string);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
  
  searchStudents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;;
      const { query } = req.query;
      const data = await TeacherStudentService.searchStudents(teacherId, String(query || ""));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  registerStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { firstName, lastName, email } = req.body;
      if (!firstName || !email)
        throw createHttpError(400, "First name and email are required.");

      const student = await TeacherStudentService.registerStudent(teacherId, {
        firstName,
        lastName,
        email,
      });
      res.status(201).json({ success: true, data: student });
    } catch (err) {
      next(err);
    }
  },

  addMembersToGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { groupId, studentIds } = req.body;
      if (!groupId || !Array.isArray(studentIds))
        throw createHttpError(400, "Group ID and student IDs are required.");

      const data = await TeacherStudentService.addMembersToGroup(teacherId, groupId, studentIds);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  addStudentToGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { groupId, studentId } = req.body;
      if (!groupId || !studentId)
        throw createHttpError(400, "Group ID and student ID are required.");

      const data = await TeacherStudentService.addStudentToGroup(teacherId, groupId, studentId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  removeStudentFromGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId =
        (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;

      const { groupId, studentId } = req.params;

      if (!groupId || !studentId)
        throw createHttpError(400, "Group ID and Student ID are required.");

      const result = await TeacherStudentService.removeStudentFromGroup(
        teacherId,
        groupId as string,
        studentId as string
      );

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  inviteStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id;
      const { email } = req.body;
      if (!email) throw createHttpError(400, "Email is required.");

      const data = await TeacherStudentService.inviteStudent(teacherId, email);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  inviteStudentToGroup: async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = (req.user as any)?.id || (req.user as any)?.userId;
    const { email, groupId } = req.body;

    const data = await TeacherStudentService.inviteStudentToGroup(teacherId, email, groupId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
},

async getTeacherMailLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = (req.user as any)?.id ||
        (req.user as any)?.userId ||
        (req.user as any)?._id; // ensure req.user is set by auth middleware
      const limit = Number(req.query.limit) || 50;

      const logs = await MailLogService.getTeacherMailLogs(teacherId, limit);
      res.status(200).json({ count: logs.length, logs });
    } catch (err) {
      next(err);
    }
  },

  async getMailLogById(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId =
      (req.user as any)?.id ||
      (req.user as any)?.userId ||
      (req.user as any)?._id;

    const mailId = req.params.id;
    const mail = await MailLogService.getMailLogById(teacherId, mailId as string);

    res.status(200).json({ success: true, data: mail });
  } catch (err) {
    next(err);
  }
  }
};
