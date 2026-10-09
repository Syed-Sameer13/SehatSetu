import { request } from './apiClient';
import { AuditLog } from '../types';

export async function fetchAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  return request<AuditLog[]>(`/audit/logs?limit=${limit}`);
}
