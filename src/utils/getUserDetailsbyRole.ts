import { Role } from "@prisma/client";
import { userRole } from "../config/core";

export default function getUserIncludeByRole(role: Role) {
  switch (role) {
    case userRole.Student:
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

    case userRole.Teacher:
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

    case userRole.Admin:
      return {
        activityLogs: true,
        receivedMails: true,
        sentMails: true,
      };

    default:
      return {};
  }
}
