import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchDepartments } from '../services/departmentService';
import { submitPatientIntake } from '../services/patientService';
import { PatientIntakePayload, PatientIntakeData, AISummarizeResponse } from '../types';
import { aiService } from '../services/aiService';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import {
  UserPlus,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Brain,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Form interface
interface IntakeFormData {
  full_name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone_number?: string;
  emergency_contact_phone?: string;
  address?: string;
  department_id: string;
  chief_complaint: string;
  vital_observations: {
    systolic_bp?: number;
    diastolic_bp?: number;
    heart_rate?: number;
    respiratory_rate?: number;
    spo2?: number;
    temperature_f?: number;
    blood_glucose_mg_dl?: number;
    gcs?: number;
  };
}

// Intake Zod Schema
const intakeFormSchema = z.object({
  full_name: z.string().min(2, 'Full legal name is required'),
  age: z.coerce.number().min(0, 'Age must be 0 or greater').max(130, 'Age exceeds standard human range'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone_number: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  address: z.string().optional(),
  department_id: z.string().min(1, 'Please select a clinical department'),
  chief_complaint: z.string().min(3, 'Chief complaint description is required (min 3 characters)'),
  vital_observations: z.object({
    systolic_bp: z.coerce.number().min(40).max(300).optional(),
    diastolic_bp: z.coerce.number().min(20).max(200).optional(),
    heart_rate: z.coerce.number().min(20).max(300).optional(),
    respiratory_rate: z.coerce.number().min(4).max(80).optional(),
    spo2: z.coerce.number().min(40).max(100).optional(),
    temperature_f: z.coerce.number().min(85).max(115).optional(),
    blood_glucose_mg_dl: z.coerce.number().min(10).max(1200).optional(),
    gcs: z.coerce.number().min(3).max(15).optional(),
  }).default({}),
});

export const IntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useApp();
  const [successData, setSuccessData] = useState<PatientIntakeData | null>(null);

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema) as any,
    defaultValues: {
      full_name: '',
      age: 0,
      gender: 'MALE',
      phone_number: '',
      emergency_contact_phone: '',
      address: '',
      department_id: '',
      chief_complaint: '',
      vital_observations: {},
    },
  });

  // Watch vital values for live preview calculation
  const watchedVitals = watch('vital_observations');
  const watchedComplaint = watch('chief_complaint');

  const [aiSummary, setAiSummary] = useState<AISummarizeResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const handleGenerateAiSummary = async () => {
    if (!watchedComplaint || watchedComplaint.trim().length < 3) return;
    setIsAiLoading(true);
    try {
      const res = await aiService.summarizeSymptoms({
        chief_complaint: watchedComplaint,
      });
      setAiSummary(res);
    } catch (e) {
      console.error('Failed to generate AI summary:', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Submit Mutation
  const intakeMutation = useMutation({
    mutationFn: submitPatientIntake,
    onSuccess: (res) => {
      setSuccessData(res.data);
    },
  });

  const onSubmit = (data: IntakeFormData) => {
    const payload: PatientIntakePayload = {
      full_name: data.full_name,
      age: Number(data.age),
      gender: data.gender,
      phone_number: data.phone_number || undefined,
      emergency_contact_phone: data.emergency_contact_phone || undefined,
      address: data.address || undefined,
      department_id: data.department_id,
      chief_complaint: data.chief_complaint,
      vital_observations: data.vital_observations || {},
    };

    intakeMutation.mutate(payload);
  };

  // Preset quick fill helpers for synthetic scenarios
  const applyPreset = (type: 'critical' | 'high' | 'low') => {
    const defaultDept = departments?.[0]?.id || '';
    if (type === 'critical') {
      setValue('full_name', 'Aarav Sharma');
      setValue('age', 48);
      setValue('gender', 'MALE');
      setValue('phone_number', '+91-9876543210');
      setValue('address', 'B-42, Sector 14, Noida, UP');
      setValue('department_id', defaultDept);
      setValue('chief_complaint', 'Acute severe substernal chest pain radiating to left arm for 45 minutes with diaphoresis and shortness of breath.');
      setValue('vital_observations.systolic_bp', 165);
      setValue('vital_observations.diastolic_bp', 102);
      setValue('vital_observations.heart_rate', 118);
      setValue('vital_observations.respiratory_rate', 26);
      setValue('vital_observations.spo2', 91);
      setValue('vital_observations.temperature_f', 98.6);
      setValue('vital_observations.gcs', 15);
    } else if (type === 'high') {
      setValue('full_name', 'Sunita Devi');
      setValue('age', 62);
      setValue('gender', 'FEMALE');
      setValue('phone_number', '+91-9876543211');
      setValue('address', 'Flat 102, Shanti Nagar, Lucknow, UP');
      setValue('department_id', defaultDept);
      setValue('chief_complaint', 'High grade fever for 3 days with persistent vomiting, extreme lethargy and dizziness upon standing.');
      setValue('vital_observations.systolic_bp', 110);
      setValue('vital_observations.diastolic_bp', 70);
      setValue('vital_observations.heart_rate', 112);
      setValue('vital_observations.respiratory_rate', 22);
      setValue('vital_observations.spo2', 96);
      setValue('vital_observations.temperature_f', 102.8);
      setValue('vital_observations.gcs', 15);
    } else {
      setValue('full_name', 'Rajesh Patel');
      setValue('age', 35);
      setValue('gender', 'MALE');
      setValue('phone_number', '+91-9876543212');
      setValue('address', '12/4, Station Road, Ahmedabad, GJ');
      setValue('department_id', defaultDept);
      setValue('chief_complaint', 'Mild lumbar back strain after lifting heavy luggage yesterday. Pain exacerbated by bending.');
      setValue('vital_observations.systolic_bp', 122);
      setValue('vital_observations.diastolic_bp', 80);
      setValue('vital_observations.heart_rate', 74);
      setValue('vital_observations.respiratory_rate', 16);
      setValue('vital_observations.spo2', 99);
      setValue('vital_observations.temperature_f', 98.4);
      setValue('vital_observations.gcs', 15);
    }
  };

  // Client-side quick preview of urgency score
  const getPreviewUrgency = () => {
    const spo2 = watchedVitals?.spo2;
    const hr = watchedVitals?.heart_rate;
    const gcs = watchedVitals?.gcs;
    const complaint = (watchedComplaint || '').toLowerCase();

    if (
      (spo2 && spo2 < 90) ||
      (gcs && gcs <= 8) ||
      complaint.includes('cardiac arrest') ||
      complaint.includes('unresponsive')
    ) {
      return { category: 'CRITICAL', score: 95 };
    }
    if (
      (spo2 && spo2 < 94) ||
      (hr && (hr > 120 || hr < 50)) ||
      complaint.includes('chest pain') ||
      complaint.includes('stroke')
    ) {
      return { category: 'HIGH', score: 75 };
    }
    if (hr && hr > 100) {
      return { category: 'MODERATE', score: 45 };
    }
    return { category: 'LOW', score: 20 };
  };

  const preview = getPreviewUrgency();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-700" />
            {t('intake_title')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('intake_subtitle')}
          </p>
        </div>

        {/* Demo Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 px-1">{t('synthetic_presets')}</span>
          <button
            type="button"
            onClick={() => applyPreset('critical')}
            className="px-2 py-1 text-[11px] font-medium bg-white text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors cursor-pointer"
          >
            {t('preset_critical')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('high')}
            className="px-2 py-1 text-[11px] font-medium bg-white text-orange-700 hover:bg-orange-50 rounded border border-orange-200 transition-colors cursor-pointer"
          >
            {t('preset_high')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('low')}
            className="px-2 py-1 text-[11px] font-medium bg-white text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors cursor-pointer"
          >
            {t('preset_low')}
          </button>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {successData && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900">{t('success_modal_title')}</h3>
                <p className="text-xs text-emerald-700">
                  {t('lbl_assigned_uhid')}: <strong>{successData.patient.uhid}</strong> • {t('lbl_queue_pos')}: <strong>#{successData.queue_position}</strong>
                </p>
              </div>
            </div>
            <StatusBadge type="urgency" value={successData.triage_assessment.urgency_category} />
          </div>

          <div className="bg-white/80 p-4 rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-1.5">
            <div className="font-semibold text-slate-900">{t('lbl_rule_evidence')}</div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              {successData.triage_assessment.rule_evidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                reset();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('btn_register_another')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/queue')}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {t('btn_go_to_queue')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Demographics */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">{t('sec_demographics')}</h3>
            <p className="text-xs text-slate-500">{t('sec_demographics_sub')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('lbl_fullname')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('full_name')}
                placeholder="e.g. Aarav Sharma"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
              {errors.full_name && (
                <p className="text-[11px] text-red-600 mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('lbl_age')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('age', { valueAsNumber: true })}
                placeholder="e.g. 48"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
              {errors.age && (
                <p className="text-[11px] text-red-600 mt-1">{errors.age.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('lbl_gender')} <span className="text-red-500">*</span>
              </label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              >
                <option value="MALE">{t('gender_male')}</option>
                <option value="FEMALE">{t('gender_female')}</option>
                <option value="OTHER">{t('gender_other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('lbl_phone')}</label>
              <input
                type="tel"
                {...register('phone_number')}
                placeholder="+91-9876543210"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('lbl_emergency_phone')}</label>
              <input
                type="tel"
                {...register('emergency_contact_phone')}
                placeholder="+91-9876543299"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('lbl_dept')} <span className="text-red-500">*</span>
            </label>
            <select
              {...register('department_id')}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
            >
              <option value="">-- Choose Assigned Department --</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
            {errors.department_id && (
              <p className="text-[11px] text-red-600 mt-1">{errors.department_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('lbl_address')}</label>
            <input
              type="text"
              {...register('address')}
              placeholder="e.g. B-42, Sector 14, Noida, UP"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 2: Chief Complaints */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('sec_complaint')}</h3>
              <p className="text-xs text-slate-500">{t('sec_complaint_sub')}</p>
            </div>
            <button
              type="button"
              onClick={handleGenerateAiSummary}
              disabled={isAiLoading || !watchedComplaint || watchedComplaint.trim().length < 3}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              {isAiLoading ? 'Analyzing...' : t('btn_ai_assistant')}
            </button>
          </div>

          <div>
            <textarea
              rows={3}
              {...register('chief_complaint')}
              placeholder="e.g. Acute severe substernal chest pain radiating to left arm for 45 minutes, accompanied by diaphoresis and shortness of breath."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
            ></textarea>
            {errors.chief_complaint && (
              <p className="text-[11px] text-red-600 mt-1">{errors.chief_complaint.message}</p>
            )}
          </div>

          {aiSummary && (
            <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-lg text-indigo-950 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-900">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Structured Clinical Extract
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">Model: {aiSummary.model}</span>
              </div>
              <div className="whitespace-pre-line text-xs leading-relaxed text-indigo-900">
                {aiSummary.summary}
              </div>
              <div className="text-[10px] text-indigo-700 italic pt-1 border-t border-indigo-200/50">
                {aiSummary.safety_disclaimer}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Vital Observations */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-700" />
                {t('sec_vitals')}
              </h3>
              <p className="text-xs text-slate-500">{t('sec_vitals_sub')}</p>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">{t('lbl_preliminary_preview')}</span>
              <StatusBadge type="urgency" value={preview.category} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                {t('lbl_bp_sys')}
              </label>
              <input
                type="number"
                {...register('vital_observations.systolic_bp', { valueAsNumber: true })}
                placeholder="e.g. 120"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                {t('lbl_bp_dia')}
              </label>
              <input
                type="number"
                {...register('vital_observations.diastolic_bp', { valueAsNumber: true })}
                placeholder="e.g. 80"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-red-500" />
                {t('lbl_hr')}
              </label>
              <input
                type="number"
                {...register('vital_observations.heart_rate', { valueAsNumber: true })}
                placeholder="e.g. 78"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                {t('lbl_spo2')}
              </label>
              <input
                type="number"
                {...register('vital_observations.spo2', { valueAsNumber: true })}
                placeholder="e.g. 98"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-teal-600" />
                {t('lbl_rr')}
              </label>
              <input
                type="number"
                {...register('vital_observations.respiratory_rate', { valueAsNumber: true })}
                placeholder="e.g. 16"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                {t('lbl_temp')}
              </label>
              <input
                type="number"
                step="0.1"
                {...register('vital_observations.temperature_f', { valueAsNumber: true })}
                placeholder="e.g. 98.6"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-purple-500" />
                {t('lbl_glucose')}
              </label>
              <input
                type="number"
                {...register('vital_observations.blood_glucose_mg_dl', { valueAsNumber: true })}
                placeholder="e.g. 110"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-indigo-500" />
                {t('lbl_gcs')}
              </label>
              <input
                type="number"
                {...register('vital_observations.gcs', { valueAsNumber: true })}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Form Submission Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            {t('btn_reset')}
          </button>

          <button
            type="submit"
            disabled={isSubmitting || intakeMutation.isPending}
            className="px-6 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            {intakeMutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('btn_submitting')}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t('btn_submit_intake')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
