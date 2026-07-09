import { apiCall } from './apiClient';

export interface AdminUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  userId: string;
  username: string;
  role: string;
  title: string;
  message: string;
  browserInfo: string;
  createdAt: string;
}

export const adminApi = {
  getUsers(): Promise<AdminUser[]> {
    return apiCall<AdminUser[]>('/admin/users');
  },
  deleteUser(userId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },
  getFeedbacks(): Promise<Feedback[]> {
    return apiCall<Feedback[]>('/admin/feedbacks');
  }
};
