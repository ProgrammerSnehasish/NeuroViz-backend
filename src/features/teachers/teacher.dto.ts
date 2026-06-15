import { z } from "zod";
import { EvaluationMode } from "../../config/core";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────────────────────────────────

export const PaginationDto = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationDto = z.infer<typeof PaginationDto>;

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/** POST /teacher/dashboard/notifications */
export const PostNotificationDto = z.object({
  title:   z.string().min(1, "Title is required").max(120),
  message: z.string().min(1, "Message is required").max(1000),
});
export type PostNotificationDto = z.infer<typeof PostNotificationDto>;

/** POST /teacher/dashboard/broadcast */
export const BroadcastAnnouncementDto = z.object({
  title:   z.string().min(1, "Title is required").max(120),
  message: z.string().min(1, "Message is required").max(1000),
});
export type BroadcastAnnouncementDto = z.infer<typeof BroadcastAnnouncementDto>;

/** POST /teacher/dashboard/feedback */
export const GiveFeedbackDto = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  feedback:  z.string().min(1, "Feedback text is required").max(2000),
});
export type GiveFeedbackDto = z.infer<typeof GiveFeedbackDto>;

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /teacher/students/register */
export const RegisterStudentDto = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName:  z.string().min(1, "Last name is required").max(50),
  email:     z.string().email("Invalid email address"),
});
export type RegisterStudentDto = z.infer<typeof RegisterStudentDto>;

/** POST /teacher/students/invite */
export const InviteStudentDto = z.object({
  email: z.string().email("Invalid email address"),
});
export type InviteStudentDto = z.infer<typeof InviteStudentDto>;

/** GET /teacher/students/search?query= */
export const SearchStudentsDto = z.object({
  query: z.string().min(1, "Search query is required").max(100),
});
export type SearchStudentsDto = z.infer<typeof SearchStudentsDto>;

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /teacher/students/groups */
export const CreateGroupDto = z.object({
  name:        z.string().min(1, "Group name is required").max(80),
  description: z.string().max(300).optional(),
});
export type CreateGroupDto = z.infer<typeof CreateGroupDto>;

/** PATCH /teacher/students/groups/:groupId */
export const UpdateGroupDto = z.object({
  name:        z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
}).refine((d) => d.name !== undefined || d.description !== undefined, {
  message: "Provide at least one field to update",
});
export type UpdateGroupDto = z.infer<typeof UpdateGroupDto>;

/** POST /teacher/students/groups/:groupId/members */
export const AddMembersToGroupDto = z.object({
  studentIds: z.array(z.string().uuid()).min(1, "Provide at least one student ID"),
});
export type AddMembersToGroupDto = z.infer<typeof AddMembersToGroupDto>;

/** POST /teacher/students/groups/:groupId/invite */
export const InviteStudentToGroupDto = z.object({
  email: z.string().email("Invalid email address"),
});
export type InviteStudentToGroupDto = z.infer<typeof InviteStudentToGroupDto>;

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /teacher/assignments */
export const CreateAssignmentDto = z.object({
  title:          z.string().min(1, "Title is required").max(200),
  description:    z.string().max(2000).optional(),
  dueDate:        z.coerce.date().optional(),
  studentIds:     z.array(z.string().uuid()).optional(),
  groupIds:       z.array(z.string().uuid()).optional(),
  evaluationMode: z.nativeEnum(EvaluationMode).default(EvaluationMode.Auto), // ← fixed
}).refine(
  (d) => (d.studentIds?.length ?? 0) + (d.groupIds?.length ?? 0) > 0,
  { message: "Assign to at least one student or group" }
);
export type CreateAssignmentDto = z.infer<typeof CreateAssignmentDto>;

/** PATCH /teacher/assignments/:assignmentId */
export const UpdateAssignmentDto = z.object({
  title:          z.string().min(1).max(200).optional(),
  description:    z.string().max(2000).optional(),
  dueDate:        z.coerce.date().optional(),
  studentIds:     z.array(z.string().uuid()).optional(),
  groupIds:       z.array(z.string().uuid()).optional(),
  evaluationMode: z.nativeEnum(EvaluationMode).optional(),                   // ← fixed
}).refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: "Provide at least one field to update" }
);
export type UpdateAssignmentDto = z.infer<typeof UpdateAssignmentDto>;

/** POST /teacher/assignments/:assignmentId/evaluate/:submissionId */
export const EvaluateSubmissionDto = z.object({
  mode:     z.nativeEnum(EvaluationMode).default(EvaluationMode.Auto),       // ← fixed
  grade:    z.number().int().min(0).max(100).optional(),
  feedback: z.string().max(2000).optional(),
}).refine(
  (d) => d.mode !== EvaluationMode.Manual || (d.grade !== undefined && d.feedback !== undefined),
  { message: "Manual mode requires both grade and feedback" }
);
export type EvaluateSubmissionDto = z.infer<typeof EvaluateSubmissionDto>;

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW
// ─────────────────────────────────────────────────────────────────────────────

/** POST /teacher/review/:submissionId */
export const ReviewSubmissionDto = z.object({
  grade:    z.number().int().min(0).max(100),
  feedback: z.string().max(2000).optional(),
});
export type ReviewSubmissionDto = z.infer<typeof ReviewSubmissionDto>;

// ─────────────────────────────────────────────────────────────────────────────
// MINDMAPS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /teacher/mindmaps/:mindmapId/review */
export const ReviewMindmapDto = z.object({
  approval: z.boolean(),
  comment:  z.string().max(1000).optional(),
});
export type ReviewMindmapDto = z.infer<typeof ReviewMindmapDto>;

/** GET /teacher/mindmaps?status=&search= */
export const MindmapFilterDto = z.object({
  status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional(),
  search: z.string().max(100).optional(),
});
export type MindmapFilterDto = z.infer<typeof MindmapFilterDto>;

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /teacher/analytics/strategy/student */
export const StudentStrategyDto = z.object({
  studentId: z.string().uuid("Invalid student ID"),
});
export type StudentStrategyDto = z.infer<typeof StudentStrategyDto>;