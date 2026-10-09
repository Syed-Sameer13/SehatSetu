// Urgency Categories matching backend definitions
export type UrgencyCategory = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'NEEDS_REVIEW';

// Visit Statuses matching backend definitions
export type VisitStatus = 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';

// Staff Roles
export type StaffRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'REGISTRATION';

// Gender
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// Department Model
export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

// Patient Demographic Model
export interface Patient {
  id: string;
  uhid: string;
  full_name: string;
  age: number;
  gender: Gender;
  phone_number?: string;
  emergency_contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// Vital Sign Observations
export interface VitalObservations {
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  spo2?: number;
  temperature_f?: number;
  blood_glucose_mg_dl?: number;
  gcs?: number;
}

// Visit Model
export interface Visit {
  id: string;
  patient_id: string;
  department_id: string;
  doctor_id?: string;
  status: VisitStatus;
  chief_complaint: string;
  vital_observations: VitalObservations;
  arrival_time: string;
  called_at?: string;
  consultation_started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Triage Assessment Model
export interface TriageAssessment {
  id: string;
  visit_id: string;
  urgency_category: UrgencyCategory;
  urgency_score: number;
  rule_evidence: string[];
  missing_vital_flags: string[];
  ai_symptom_summary?: string;
  is_overridden: boolean;
  override_reason?: string;
  created_at: string;
  updated_at: string;
}

// Intake Request & Response
export interface PatientIntakePayload {
  full_name: string;
  age: number;
  gender: Gender;
  phone_number?: string;
  emergency_contact_phone?: string;
  address?: string;
  uhid?: string;
  department_id: string;
  chief_complaint: string;
  vital_observations: VitalObservations;
}

export interface PatientIntakeData {
  patient: Patient;
  visit: Visit;
  triage_assessment: TriageAssessment;
  queue_position: number;
}

// Standard API Response Envelopes
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

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}
