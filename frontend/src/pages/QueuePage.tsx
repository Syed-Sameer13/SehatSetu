import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDepartments } from '../services/departmentService';
import { fetchQueue, callNextPatient, updateVisitStatus, overrideTriagePriority } from '../services/queueService';
import { QueueEntry, UrgencyCategory, VisitStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { aiService } from '../services/aiService';
import { AISummarizeResponse } from '../types';
import {
  Users,
  Bell,
  Clock,
  Activity,
  Heart,
  Thermometer,
  Droplets,
  ShieldAlert,
  ChevronRight,
  X,
  Search,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const QueuePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('WAITING');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<QueueEntry | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [overrideCategory, setOverrideCategory] = useState<UrgencyCategory>('HIGH');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [callFeedback, setCallFeedback] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AISummarizeResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const handleOpenPatientReview = (entry: QueueEntry) => {
    setSelectedPatient(entry);
    setAiSummary(null);
  };

  const handleGenerateAiSummary = async () => {
    if (!selectedPatient) return;
    setIsAiLoading(true);
    try {
      const res = await aiService.summarizeSymptoms({
        chief_complaint: selectedPatient.chief_complaint,
      });
      setAiSummary(res);
    } catch (e) {
      console.error('Failed to generate AI summary:', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  // Fetch queue
  const { data: queue, isLoading, refetch } = useQuery({
    queryKey: ['queue', selectedDept, statusFilter],
    queryFn: () => fetchQueue(selectedDept || undefined, statusFilter),
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Call Next Patient Mutation
  const callNextMutation = useMutation({
    mutationFn: (deptId: string) => callNextPatient(deptId, 'OPD Room 1'),
    onSuccess: (res) => {
      setCallFeedback(res.message);
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      if (res.data) {
        setSelectedPatient(res.data);
      }
      setTimeout(() => setCallFeedback(null), 6000);
    },
  });

  // Status Transition Mutation
  const statusMutation = useMutation({
    mutationFn: ({ visitId, status }: { visitId: string; status: VisitStatus }) =>
      updateVisitStatus(visitId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      if (selectedPatient) {
        setSelectedPatient(null);
      }
    },
  });

  // Priority Override Mutation
  const overrideMutation = useMutation({
    mutationFn: ({
      visitId,
      category,
      reason,
    }: {
      visitId: string;
      category: UrgencyCategory;
      reason: string;
    }) => overrideTriagePriority(visitId, category, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      setIsOverrideModalOpen(false);
      setOverrideReason('');
      if (selectedPatient) {
        setSelectedPatient(null);
      }
    },
  });

  // Filter queue by urgency category and search query
  const filteredQueue = (queue || []).filter((entry) => {
    if (urgencyFilter !== 'ALL' && entry.urgency_category !== urgencyFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        entry.full_name.toLowerCase().includes(q) ||
        entry.uhid.toLowerCase().includes(q) ||
        entry.chief_complaint.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeDeptName =
    departments?.find((d) => d.id === selectedDept)?.name || 'All Departments';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Quick Call Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-700" />
            Dynamic Patient Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Server-prioritized clinical queue sorted by <strong>Priority Rank</strong> (Urgency + Wait Duration).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={callNextMutation.isPending}
            onClick={() => {
              const deptToCall = selectedDept || departments?.[0]?.id;
              if (deptToCall) {
                callNextMutation.mutate(deptToCall);
              }
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 rounded-md transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {callNextMutation.isPending ? 'Calling Patient...' : '⚡ Call Next Patient'}
          </button>
          <Link
            to="/intake"
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors shadow-sm"
          >
            + Register Patient
          </Link>
        </div>
      </div>

      {/* Call Feedback Notification */}
      {callFeedback && (
        <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg flex items-center justify-between text-xs text-teal-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-700 animate-bounce" />
            <span>{callFeedback}</span>
          </div>
          <button onClick={() => setCallFeedback(null)} className="text-teal-700 hover:text-teal-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Department Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-600 font-medium text-slate-800"
            >
              <option value="">All Departments</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium text-slate-600">
            {['WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'ALL'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, UHID, symptom..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-800"
            />
          </div>
        </div>

        {/* Urgency Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Urgency Filter:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'NEEDS_REVIEW'].map((u) => (
            <button
              key={u}
              onClick={() => setUrgencyFilter(u)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                urgencyFilter === u
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Main Queue Content */}
      {isLoading ? (
        <LoadingState message="Calculating server-side dynamic priority queue..." />
      ) : filteredQueue.length === 0 ? (
        <EmptyState
          title={`No patients currently ${statusFilter.toLowerCase()}`}
          description={`There are no patient records matching your current filter in ${activeDeptName}.`}
          actionText="Register New Patient"
          onAction={() => refetch()}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Patient & UHID</th>
                  <th className="py-3 px-4">Triage Urgency</th>
                  <th className="py-3 px-4">Wait Duration</th>
                  <th className="py-3 px-4">Priority Rank</th>
                  <th className="py-3 px-4">Chief Complaint & Evidence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((entry, idx) => (
                  <tr
                    key={entry.visit_id}
                    onClick={() => handleOpenPatientReview(entry)}
                    className={`hover:bg-teal-50/40 transition-colors cursor-pointer ${
                      entry.urgency_category === 'CRITICAL' ? 'bg-red-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-800">
                      #{idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{entry.full_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {entry.age}y • {entry.gender} • <span className="font-mono text-slate-700">{entry.uhid}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge type="urgency" value={entry.urgency_category} />
                      {entry.is_overridden && (
                        <span className="block text-[10px] font-semibold text-purple-700 mt-0.5">
                          (Clinician Overridden)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{entry.waiting_duration_minutes} mins</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Arrived: {new Date(entry.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                        {entry.calculated_priority_rank} pts
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="line-clamp-1 text-slate-800 font-medium">{entry.chief_complaint}</p>
                      {entry.rule_evidence.length > 0 && (
                        <p className="line-clamp-1 text-[11px] text-slate-500 mt-0.5">
                          • {entry.rule_evidence[0]}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPatientReview(entry);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded transition-colors"
                      >
                        Review
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Review & Clinical Action Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{selectedPatient.full_name}</h3>
                  <span className="text-xs font-mono text-slate-500">({selectedPatient.uhid})</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.department_name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge type="urgency" value={selectedPatient.urgency_category} />
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Vital Signs Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recorded Baseline Vitals
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Blood Pressure</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedPatient.vital_observations.systolic_bp || '--'} /{' '}
                    {selectedPatient.vital_observations.diastolic_bp || '--'} mmHg
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                    <Activity className="w-3.5 h-3.5 text-red-500" />
                    <span>Heart Rate</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedPatient.vital_observations.heart_rate || '--'} bpm
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" />
                    <span>Oxygen (SpO2)</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedPatient.vital_observations.spo2 || '--'}%
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Temperature</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedPatient.vital_observations.temperature_f || '--'}°F
                  </div>
                </div>
              </div>
            </div>

            {/* Chief Complaint & Rule Evidence */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-900">Reported Symptoms:</span>
                <p className="text-slate-700 mt-1 leading-relaxed">{selectedPatient.chief_complaint}</p>
              </div>

              {/* AI Clinical Extractive Summary Card */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-bold text-slate-900">AI Clinical Summary Assistant</span>
                  </div>
                  {!aiSummary && (
                    <button
                      type="button"
                      onClick={handleGenerateAiSummary}
                      disabled={isAiLoading}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition disabled:opacity-60"
                    >
                      <Sparkles className={`w-3 h-3 ${isAiLoading ? 'animate-spin' : ''}`} />
                      {isAiLoading ? 'Analyzing...' : 'Generate AI Summary'}
                    </button>
                  )}
                </div>

                {aiSummary ? (
                  <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-md text-indigo-950 space-y-1.5 animate-in fade-in duration-150">
                    <div className="whitespace-pre-line text-xs leading-relaxed font-medium">
                      {aiSummary.summary}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-indigo-200/50 text-[10px] text-indigo-700">
                      <span>Model: {aiSummary.model}</span>
                      <span className="italic">{aiSummary.safety_disclaimer}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Click generate to produce an extractive structured summary of primary symptoms, duration, and aggravating factors.
                  </p>
                )}
              </div>

              <div className="border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-900">Triage Rule Explanations:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 mt-1">
                  {selectedPatient.rule_evidence.map((ev, idx) => (
                    <li key={idx}>{ev}</li>
                  ))}
                </ul>
              </div>

              {selectedPatient.is_overridden && (
                <div className="bg-purple-50 p-2.5 rounded border border-purple-200 text-purple-900">
                  <span className="font-bold">Manual Clinical Override Reason:</span>
                  <p className="text-purple-700 mt-0.5">{selectedPatient.override_reason}</p>
                </div>
              )}
            </div>

            {/* Clinical Actions & Status Transitions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors"
              >
                Override Urgency Category
              </button>

              <div className="flex items-center gap-2">
                {selectedPatient.status === 'WAITING' && (
                  <button
                    type="button"
                    onClick={() =>
                      statusMutation.mutate({
                        visitId: selectedPatient.visit_id,
                        status: 'CALLED',
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-xs"
                  >
                    Mark as Called
                  </button>
                )}

                {selectedPatient.status === 'CALLED' && (
                  <button
                    type="button"
                    onClick={() =>
                      statusMutation.mutate({
                        visitId: selectedPatient.visit_id,
                        status: 'IN_CONSULTATION',
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded transition-colors shadow-xs"
                  >
                    Start Consultation
                  </button>
                )}

                {(selectedPatient.status === 'IN_CONSULTATION' || selectedPatient.status === 'CALLED') && (
                  <button
                    type="button"
                    onClick={() =>
                      statusMutation.mutate({
                        visitId: selectedPatient.visit_id,
                        status: 'COMPLETED',
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-xs"
                  >
                    Mark Completed
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    statusMutation.mutate({
                      visitId: selectedPatient.visit_id,
                      status: 'CANCELLED',
                    })
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Cancel Visit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Priority Override Dialog */}
      {isOverrideModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-700" />
                Override Triage Urgency Category
              </h3>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Patient: <strong>{selectedPatient.full_name}</strong> ({selectedPatient.uhid})
              <div className="text-slate-500 mt-0.5">
                Current Automated Category: <strong>{selectedPatient.urgency_category}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Target Category
              </label>
              <select
                value={overrideCategory}
                onChange={(e) => setOverrideCategory(e.target.value as UrgencyCategory)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-purple-600 focus:outline-none"
              >
                <option value="CRITICAL">● CRITICAL</option>
                <option value="HIGH">● HIGH</option>
                <option value="MODERATE">● MODERATE</option>
                <option value="LOW">● LOW</option>
                <option value="NEEDS_REVIEW">● NEEDS_REVIEW</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Justification Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Clinical presentation indicates sudden onset diaphoresis and altered sensorium upon physical inspection..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-purple-600 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={overrideReason.trim().length < 5 || overrideMutation.isPending}
                onClick={() =>
                  overrideMutation.mutate({
                    visitId: selectedPatient.visit_id,
                    category: overrideCategory,
                    reason: overrideReason,
                  })
                }
                className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 rounded shadow-xs cursor-pointer"
              >
                {overrideMutation.isPending ? 'Saving Override...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
