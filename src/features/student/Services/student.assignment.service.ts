import createHttpError from "http-errors";
import prisma from "../../../config/database";
import { uploadSubmissionDocument } from "../../../utils/uploadSubmission";
import { CreateSubmissionDto } from "../student.dto";

async function logActivity(
  userId: string | null | undefined,
  action: string,
  details?: string
) {
  if (!userId) return;
  try {
    await prisma.activityLog.create({ data: { userId, action, details } });
  } catch (err) {
    console.error("⚠️ Failed to write activity log:", err);
  }
}

/**
 * Matches the Prisma enum:
 *   enum SubmissionContentType { TEXT, MINDMAP, DOCUMENT }
 * Adjust the string union below if your enum has different/more values.
 */



const SUBMISSION_SELECT = {
  id: true,
  contentType: true,
  textContent: true,
  mindmapId: true,
  documentUrl: true,
  documentName: true,
  status: true,
  grade: true,
  feedback: true,
  sentiment: true,
  sentimentScore: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const StudentAssignmentService = {
  /**
   * GET /student/assignments
   *
   * FIX: Assignment has no studentIds[] array column. Access is via:
   *   - AssignmentStudent junction (direct assignment)
   *   - AssignmentGroup junction → GroupMember junction (group assignment)
   *
   * Schema:
   *   Assignment { assignedTo AssignmentStudent[], assignmentGroups AssignmentGroup[] }
   *   AssignmentStudent { assignmentId, studentId, status }
   *   AssignmentGroup   { assignmentId, groupId }
   *   GroupMember       { groupId, userId }
   */
  async getMyAssignments(studentId: string) {
    // Step 1: get all group IDs this student belongs to
    const memberships = await prisma.groupMember.findMany({
      where: { userId: studentId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    // Step 2: find assignments — direct OR via group
    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { assignedTo: { some: { studentId } } },
          ...(groupIds.length > 0
            ? [{ assignmentGroups: { some: { groupId: { in: groupIds } } } }]
            : []),
        ],
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        // get only this student's status row
        assignedTo: {
          where: { studentId },
          select: { status: true },
        },
        // get only this student's submission
        submissions: {
          where: { studentId },
          select: SUBMISSION_SELECT,
        },
        assignmentGroups: {
          select: {
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      evaluationMode: a.evaluationMode,
      teacher: a.teacher,
      groups: a.assignmentGroups.map((ag) => ag.group),
      assignmentStatus: a.assignedTo[0]?.status ?? "PENDING",
      mySubmission: a.submissions[0] ?? null,
      isSubmitted: a.submissions.length > 0,
    }));
  },

  /**
   * GET /student/assignment/:assignmentId
   * Schema: same as above — access check via AssignmentStudent OR AssignmentGroup
   */
  async getAssignmentById(studentId: string, assignmentId: string) {
    const hasAccess = await checkAssignmentAccess(studentId, assignmentId);
    if (!hasAccess) {
      throw createHttpError(
        403,
        "Assignment not found or you do not have access."
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        submissions: {
          where: { studentId },
          select: SUBMISSION_SELECT,
        },
        assignmentGroups: {
          select: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!assignment) throw createHttpError(404, "Assignment not found.");

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      evaluationMode: assignment.evaluationMode,
      teacher: assignment.teacher,
      groups: assignment.assignmentGroups.map((ag) => ag.group),
      mySubmission: assignment.submissions[0] ?? null,
      isSubmitted: assignment.submissions.length > 0,
    };
  },

  /**
   * POST /student/assignment/submit
   *
   * Schema: AssignmentSubmission { assignmentId, studentId, contentType,
   *           textContent?, mindmapId?, documentUrl?, documentName?, status }
   *         AssignmentStudent    { assignmentId, studentId, status }
   *
   * For TEXT / MINDMAP / DOCUMENT, exactly one of textContent / mindmapId /
   * (documentUrl+documentName) should be populated, matching `contentType`.
   * For MIXED, two or more of those parts may be populated together.
   */
  async submitAssignment(
    studentId: string,
    data: CreateSubmissionDto,
    documentFile?: Express.Multer.File
  ) {
    // ── Validate assignment exists and student is assigned ──
    const assignment = await prisma.assignment.findUnique({
      where: { id: data.assignmentId },
    });
    if (!assignment)
      throw createHttpError(404, "Assignment not found.");

    const isAssigned = await prisma.assignmentStudent.findFirst({
      where: { assignmentId: data.assignmentId, studentId },
    });
    if (!isAssigned)
      throw createHttpError(403, "You are not assigned to this assignment.");

    // ── Check no duplicate submission ──
    const existing = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: data.assignmentId, studentId },
    });
    if (existing)
      throw createHttpError(409, "You have already submitted this assignment.");

    // ── Validate content based on type ──
    if (data.contentType === "TEXT" && !data.textContent)
      throw createHttpError(400, "Text content is required for TEXT submission.");

    if ((data.contentType === "MINDMAP" || data.contentType === "MIXED") && !data.mindmapId)
      throw createHttpError(400, "Mindmap ID is required for MINDMAP submission.");

    if (data.contentType === "DOCUMENT" && !documentFile)
      throw createHttpError(400, "Document file is required for DOCUMENT submission.");

    // ── Upload document if provided ──
    let documentUrl: string | undefined;
    let documentName: string | undefined;

    if (documentFile) {
      documentUrl = await uploadSubmissionDocument(
        documentFile.buffer,
        studentId,
        data.assignmentId,
        documentFile.originalname
      );
      documentName = documentFile.originalname;
    }

    // ── Create submission ──
    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: data.assignmentId,
        studentId,
        contentType: data.contentType,
        textContent: data.textContent ?? null,
        mindmapId: data.mindmapId ?? null,
        documentUrl: documentUrl ?? null,
        documentName: documentName ?? null,
        status: "SUBMITTED",
      },
      include: {
        assignment: { select: { title: true } },
        mindmap: { select: { id: true, title: true } },
      },
    });

    await logActivity(
      studentId,
      "SUBMIT_ASSIGNMENT",
      `assignmentId = ${ data.assignmentId }`
    );

    return submission;
  },
  /**
   * GET /student/submissions
   * Schema: AssignmentSubmission + Assignment { title, dueDate, teacher }
   */
  async getMySubmissions(studentId: string) {
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { studentId },
      select: {
        ...SUBMISSION_SELECT,
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            evaluationMode: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return submissions.map((s) => ({
      submissionId: s.id,
      contentType: s.contentType,
      textContent: s.textContent,
      mindmapId: s.mindmapId,
      documentUrl: s.documentUrl,
      documentName: s.documentName,
      status: s.status,
      grade: s.grade,
      feedback: s.feedback,
      sentiment: s.sentiment,
      sentimentScore: s.sentimentScore,
      submittedAt: s.createdAt,
      updatedAt: s.updatedAt,
      assignment: s.assignment,
    }));
  },

  /**
   * GET /student/submission/:submissionId
   * Schema: AssignmentSubmission { id, studentId, ... }
   */
  async getSubmissionById(studentId: string, submissionId: string) {
    const submission = await prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, studentId },
      select: {
        ...SUBMISSION_SELECT,
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            evaluationMode: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!submission) throw createHttpError(404, "Submission not found.");
    return submission;
  },
};

/**
 * Internal access check.
 * Returns true if the student is directly assigned (AssignmentStudent)
 * OR assigned via a group they're in (AssignmentGroup + GroupMember).
 */
async function checkAssignmentAccess(
  studentId: string,
  assignmentId: string
): Promise<boolean> {
  const direct = await prisma.assignmentStudent.findFirst({
    where: { assignmentId, studentId },
  });
  if (direct) return true;

  const viaGroup = await prisma.assignmentGroup.findFirst({
    where: {
      assignmentId,
      group: {
        members: { some: { userId: studentId } },
      },
    },
  });
  return !!viaGroup;
}


