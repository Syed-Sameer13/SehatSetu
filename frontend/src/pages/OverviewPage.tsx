import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus,
  Users,
  Activity,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  History,
  TrendingUp,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

export const OverviewPage: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.getOverview(),
    refetchInterval: 10000,
  });

  const waitingCount = analytics?.currently_waiting ?? 0;
  const criticalCount = analytics?.urgency_distribution?.CRITICAL ?? 0;
  const avgWait = analytics?.average_wait_time_minutes ?? 0;
  const completedToday = analytics?.completed_today ?? 0;
  const totalRegistered = analytics?.total_registered_today ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Hospital Clinical Overview
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
              Live Operations
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time patient intake monitoring, deterministic triage prioritisation, and active queue management.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/intake"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Patient Intake
          </Link>
          <Link
            to="/queue"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            View Active Queue
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Waiting</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {isLoading ? '...' : waitingCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting triage call</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Critical Flagged</span>
            <Activity className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {isLoading ? '...' : criticalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Immediate evaluation indicated</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Wait Time</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? '...' : `${avgWait}m`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Calculated from verified arrivals</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Completed Today</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {isLoading ? '...' : completedToday}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Consultations finished</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Registered</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? '...' : totalRegistered}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cumulative patient intakes</div>
        </div>
      </div>

      {/* Clinical Workflow Navigation & Department Quick Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            Specialty Departments Status
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Live patient loads currently distributed across emergency and outpatient clinical wings.
          </p>

          <div className="space-y-2 pt-1">
            {analytics?.department_load && analytics.department_load.length > 0 ? (
              analytics.department_load.slice(0, 4).map((d) => (
                <div
                  key={d.department_id}
                  className="flex items-center justify-between p-2.5 rounded border border-slate-100 bg-slate-50 text-xs"
                >
                  <span className="font-semibold text-slate-800">{d.department_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded text-[11px] font-medium">
                      {d.waiting_count} waiting
                    </span>
                    <span className="text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded text-[11px] font-medium">
                      {d.in_consultation_count} consulting
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400">Loading department status...</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Clinical Workflow Navigation</h3>
          <div className="space-y-2.5">
            <Link
              to="/intake"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                  1. Patient Intake & Triage Assessment
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Enter demographics, vitals, and chief complaints for rule evaluation</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/queue"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  2. Dynamic Prioritised Queue
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Call next patient, review vital signs, or perform doctor overrides</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/analytics"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  3. Operational Analytics & Inflow Trends
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Visualise triage urgency distribution, hourly velocity, and wait metrics</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/audit"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  4. Immutable Audit & Compliance Log
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Review chronological clinician decisions, priority overrides, and timestamps</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
