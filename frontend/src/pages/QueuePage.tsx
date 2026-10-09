import React from 'react';
import { EmptyState } from '../components/common/EmptyState';
import { Users, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QueuePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dynamic Patient Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Server-prioritized clinical queue sorted by preliminary urgency and arrival time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-md cursor-not-allowed"
          >
            <Filter className="w-3.5 h-3.5" />
            All Departments
          </button>
        </div>
      </div>

      {/* Empty State / Standby view */}
      <EmptyState
        title="No active patients in queue"
        description="Patient queue records will appear here dynamically once patients are registered in Milestone 2."
        icon={<Users className="w-6 h-6 text-teal-700" />}
        actionText="Go to Intake Page"
        onAction={() => navigate('/intake')}
      />
    </div>
  );
};
