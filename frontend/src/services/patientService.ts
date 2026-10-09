import { request } from './apiClient';
import { PatientIntakePayload, PatientIntakeData, ApiResponse, Patient } from '../types';

export async function submitPatientIntake(
  payload: PatientIntakePayload
): Promise<ApiResponse<PatientIntakeData>> {
  return request<ApiResponse<PatientIntakeData>>('/patients/intake', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPatients(search?: string): Promise<Patient[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<Patient[]>(`/patients${query}`);
}
