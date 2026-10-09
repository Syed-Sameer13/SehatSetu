import React from 'react';
import { History } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const AuditPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Clinical & Queue Audit History</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable audit log of all status transitions, triage priority overrides, and timestamps.
        </p>
      </div>

      {/* Standby Empty State */}
      <EmptyState
        title="Audit trail standby"
        description="Every patient transition, call action, and priority override will be immutably recorded here."
        icon={<History className="w-6 h-6 text-teal-700" />}
      />
    </div>
  );
};
