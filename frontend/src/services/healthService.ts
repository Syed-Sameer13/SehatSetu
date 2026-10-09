import { request } from './apiClient';
import { HealthStatus } from '../types';

export async function checkBackendHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health');
}
