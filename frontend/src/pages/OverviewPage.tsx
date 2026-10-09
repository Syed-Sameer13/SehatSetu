import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Users, Activity, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

export const OverviewPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Clinical Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time patient intake monitoring and preliminary triage queue status.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            to="/intake"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Patient Intake
          </Link>
          <Link
            to="/queue"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            View Active Queue
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Waiting</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">0</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all clinical departments</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Critical Flagged</span>
            <Activity className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">0</div>
          <div className="text-[11px] text-slate-400 mt-1">Immediate evaluation indicated</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Wait Time</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">-- mins</div>
          <div className="text-[11px] text-slate-400 mt-1">Calculated from verified visits</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Completed Today</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">0</div>
          <div className="text-[11px] text-slate-400 mt-1">Consultations finished</div>
        </div>
      </div>

      {/* Operational Quick Actions & Workflow Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">System Foundation & Verification</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            SehatSetu Foundation (Milestone 1) is active. The deterministic clinical triage rules engine and live database connections will be connected in subsequent milestones.
          </p>
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span><strong>Frontend Architecture:</strong> React 18, Vite, TypeScript, Tailwind, TanStack Query</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span><strong>Backend Architecture:</strong> Python, FastAPI, Pydantic v2 REST endpoints</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Clinical Workflow Navigation</h3>
          <div className="space-y-2">
            <Link
              to="/intake"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800">1. Patient Registration & Intake</div>
                <div className="text-[11px] text-slate-500">Enter vital observations and chief complaints</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/queue"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/50 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800">2. Dynamic Patient Queue</div>
                <div className="text-[11px] text-slate-500">Manage triage-sorted queue and patient call-next actions</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
