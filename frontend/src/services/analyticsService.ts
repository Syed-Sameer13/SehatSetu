import { request } from './apiClient';
import { AnalyticsOverview } from '../types';

export const analyticsService = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    return request<AnalyticsOverview>('/analytics/overview');
  },
};
