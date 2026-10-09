import React from 'react';
import { BarChart3, Clock, TrendingUp } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Operational Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Patient volume distribution, waiting times, and bottleneck indicators.
        </p>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Triage Category Distribution</span>
            <BarChart3 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="h-40 flex items-center justify-center border border-dashed border-slate-200 rounded text-xs text-slate-400">
            Recharts Distribution View (Milestone 5)
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Wait Time by Department</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="h-40 flex items-center justify-center border border-dashed border-slate-200 rounded text-xs text-slate-400">
            Department Wait Times View (Milestone 5)
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Hourly Intake Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="h-40 flex items-center justify-center border border-dashed border-slate-200 rounded text-xs text-slate-400">
            Intake Volume Timeline (Milestone 5)
          </div>
        </div>
      </div>
    </div>
  );
};
