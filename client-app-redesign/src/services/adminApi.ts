import { apiCall } from './apiClient';
// Tek kaynak: AdminUser/Feedback tipleri apiClient'ta tanımlı (tip tekrarını önler).
import type { AdminUser, Feedback } from './apiClient';

export type { AdminUser, Feedback };

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
