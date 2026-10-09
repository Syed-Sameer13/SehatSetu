import { request } from './apiClient';
import { QueueEntry, CallNextResponse, UrgencyCategory, VisitStatus, Visit, TriageAssessment } from '../types';

export async function fetchQueue(
  departmentId?: string,
  status: string = 'WAITING'
): Promise<QueueEntry[]> {
  const params = new URLSearchParams();
  if (departmentId) params.append('department_id', departmentId);
  if (status) params.append('status', status);

  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<QueueEntry[]>(`/queue${qs}`);
}

export async function callNextPatient(
  departmentId: string,
  roomOrDesk: string = 'Consultation Room 1'
): Promise<CallNextResponse> {
  return request<CallNextResponse>('/queue/call-next', {
    method: 'POST',
    body: JSON.stringify({ department_id: departmentId, room_or_desk: roomOrDesk }),
  });
}

export async function updateVisitStatus(
  visitId: string,
  newStatus: VisitStatus,
  notes?: string
): Promise<Visit> {
  return request<Visit>(`/visits/${visitId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus, notes }),
  });
}

export async function overrideTriagePriority(
  visitId: string,
  overrideCategory: UrgencyCategory,
  overrideReason: string
): Promise<TriageAssessment> {
  return request<TriageAssessment>(`/triage/${visitId}/override`, {
    method: 'POST',
    body: JSON.stringify({
      override_category: overrideCategory,
      override_reason: overrideReason,
    }),
  });
}
