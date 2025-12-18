import { Role } from "@prisma/client";
import { group } from "console";

export default function getUserIncludeByRole(role: Role) {
  switch (role) {
    case "STUDENT":
      return {
        studentProfile: true,
        cognitive: true,
        mindmaps: true,

        groupMemberships: true,
        groups: true,
        assignmentsReceived: true,
        assignmentSubmissions: true,
        emotionLogs: true,
        feedbacks: true,
        studentNotifications: true,
      };

    case "TEACHER":
      return {
        teacherProfile: true,
        mindmaps: true,

        groups: true,
        groupMemberships: true,
        assignmentsGiven: true,
        reviewedMindmaps: true,
        teacherStudents: true,
        teacherFeedbacksGiven: true,
        teacherFeedbacksReceived: true,
        teacherNotifications: true,
      };

    case "ADMIN":
      return {
        activityLogs: true,
        receivedMails: true,
        sentMails: true,
      };

    default:
      return {};
  }
}
