import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../services/auditService';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { History, RefreshCw } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => fetchAuditLogs(50),
    refetchInterval: 15000,
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'PRIORITY_OVERRIDE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Priority Override
          </span>
        );
      case 'CALL_NEXT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Patient Called
          </span>
        );
      case 'STATUS_UPDATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            Status Transition
          </span>
        );
      case 'PATIENT_INTAKE':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            Registration Intake
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-teal-700" />
            Clinical & Queue Audit History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all clinical actions, status changes, and priority overrides.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <LoadingState message="Loading immutable audit trail..." />
      ) : !logs || logs.length === 0 ? (
        <EmptyState
          title="No audit entries recorded yet"
          description="Actions such as patient registration, calls, and priority overrides will appear here."
          icon={<History className="w-6 h-6 text-teal-700" />}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Visit ID</th>
                  <th className="py-3 px-4">Action Summary / Reason</th>
                  <th className="py-3 px-4 text-right">Audit Origin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action_type)}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.visit_id ? log.visit_id.slice(0, 16) + '...' : '--'}
                    </td>

                    <td className="py-3 px-4 max-w-md">
                      {log.reason && (
                        <p className="font-medium text-slate-900 mb-0.5">
                          Reason: <span className="font-normal italic text-slate-700">{log.reason}</span>
                        </p>
                      )}
                      {log.new_state && (
                        <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                          {JSON.stringify(log.new_state)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right text-[11px] text-slate-500">
                      <div className="font-semibold text-slate-700">Authenticated Station</div>
                      <div className="font-mono text-[10px] text-slate-400">{log.ip_address || '127.0.0.1'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
