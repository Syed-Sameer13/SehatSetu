// Urgency Categories matching backend definitions
export type UrgencyCategory = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'NEEDS_REVIEW';

// Visit Statuses matching backend definitions
export type VisitStatus = 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';

// Staff Roles
export type StaffRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'REGISTRATION';

// Gender
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// Health Check Response
export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

// Standard API Envelope
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field?: string; issue: string }>;
  };
}
