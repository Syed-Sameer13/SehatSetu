import { request } from './apiClient';
import { Department } from '../types';

export async function fetchDepartments(): Promise<Department[]> {
  return request<Department[]>('/departments');
}
