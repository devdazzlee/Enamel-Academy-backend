import { API_PATHS } from "@/lib/api/endpoints";
import { authApi } from "@/lib/api/http";

export const assignmentService = {
  async courseAssignments(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.assignment.courseAssignments(courseId));
    return response.data;
  },

  async courseQuizzes(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.assignment.courseQuizzes(courseId));
    return response.data;
  },

  async courseAssessments(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.assignment.courseAssessments(courseId));
    return response.data;
  },

  async assignmentStats(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.assignment.assignmentStats(courseId));
    return response.data;
  },

  async quizStats(courseId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.assignment.quizStats(courseId));
    return response.data;
  },

  async assignmentDetails(assignmentId: string): Promise<unknown> {
    const response = await authApi.get(API_PATHS.assignment.assignmentDetails(assignmentId));
    return response.data;
  },

  async quizDetails(quizId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.assignment.quizDetails(quizId));
    return response.data;
  },

  async quizAttempts(quizId: string | number): Promise<unknown> {
    const response = await authApi.get(API_PATHS.assignment.quizAttempts(quizId));
    return response.data;
  },
};
