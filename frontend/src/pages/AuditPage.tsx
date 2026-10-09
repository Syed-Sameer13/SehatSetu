import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../services/auditService';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { History, RefreshCw, User, Building2, ShieldCheck, FileText, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AuditPage: React.FC = () => {
  const { t, role } = useApp();
  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => fetchAuditLogs(50),
    refetchInterval: 15000,
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'PRIORITY_OVERRIDE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <AlertCircle className="w-3 h-3" />
            {t('btn_override_urgency')}
          </span>
        );
      case 'CALL_NEXT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            {t('tab_called')}
          </span>
        );
      case 'STATUS_UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            {t('col_action')}
          </span>
        );
      case 'PATIENT_INTAKE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <FileText className="w-3 h-3" />
            {t('nav_intake')}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-teal-700" />
              {t('audit_title')}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {t('audit_live_badge')}
            </span>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('audit_subtitle')}
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-teal-700' : ''}`} />
          {t('btn_refresh')}
        </button>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <LoadingState message="Loading immutable clinical audit trail..." />
      ) : !logs || logs.length === 0 ? (
        <EmptyState
          title={t('audit_empty')}
          description="Actions such as patient registrations, triage assessments, calls, and priority overrides will appear here."
          icon={<History className="w-6 h-6 text-teal-700" />}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">{t('col_timestamp')}</th>
                  <th className="py-3 px-4">{t('col_patient_details')}</th>
                  <th className="py-3 px-4">{t('col_action_summary')}</th>
                  <th className="py-3 px-4">{t('col_clinical_reason')}</th>
                  <th className="py-3 px-4 text-right">{t('col_system_origin')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap align-top">
                      <div className="font-bold text-slate-900">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Patient & UHID & Department */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {log.patient_name || 'Patient Record'}
                            {log.uhid && (
                              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200 font-semibold">
                                {log.uhid}
                              </span>
                            )}
                          </div>
                          {log.department_name && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {log.department_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action & Summary */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1.5">
                        <div>{getActionBadge(log.action_type)}</div>
                        <div className="text-xs text-slate-700 font-medium leading-relaxed">
                          {log.summary || `Executed ${log.action_type}`}
                        </div>
                      </div>
                    </td>

                    {/* Clinical Reason / State Details */}
                    <td className="py-3.5 px-4 align-top max-w-sm">
                      {log.reason ? (
                        <div className="bg-amber-50/70 border border-amber-200 rounded p-2 text-amber-950 text-[11px]">
                          <span className="font-bold">{t('col_clinical_reason')}:</span>{' '}
                          <span className="italic">{log.reason}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Routine Clinical Procedure</span>
                      )}
                    </td>

                    {/* Origin / Station */}
                    <td className="py-3.5 px-4 text-right align-top whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-xs">Duty Station</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {log.ip_address && log.ip_address !== '127.0.0.1' ? log.ip_address : 'Hospital Subnet'}
                      </div>
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
