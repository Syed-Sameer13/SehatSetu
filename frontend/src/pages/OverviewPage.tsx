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
import { useApp } from '../context/AppContext';

export const OverviewPage: React.FC = () => {
  const { t, role } = useApp();
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

  const getRoleDescription = () => {
    switch (role) {
      case 'DOCTOR':
        return t('role_desc_doctor');
      case 'NURSE':
        return t('role_desc_nurse');
      case 'REGISTRATION':
        return t('role_desc_registration');
      case 'ADMIN':
      default:
        return t('role_desc_admin');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header & Active Role Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {t('overview_title')}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
              {t('overview_live_badge')}
            </span>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('overview_subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/intake"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {t('btn_new_intake')}
          </Link>
          <Link
            to="/queue"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            {t('btn_view_queue')}
          </Link>
        </div>
      </div>

      {/* Active Role Capability Banner */}
      <div className="bg-teal-50/70 border border-teal-200/80 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-teal-900">{t('active_role_badge')}</span>
          <span className="font-semibold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-[11px]">
            {t(`role_${role.toLowerCase()}`)}
          </span>
          <span className="text-teal-700 text-xs hidden md:inline">— {getRoleDescription()}</span>
        </div>
        <div className="text-[11px] font-medium text-teal-700">
          {t('hospital_ward')}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('kpi_active_waiting')}</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {isLoading ? '...' : waitingCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{t('kpi_active_waiting_sub')}</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('kpi_critical')}</span>
            <Activity className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {isLoading ? '...' : criticalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{t('kpi_critical_sub')}</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('kpi_avg_wait')}</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? '...' : `${avgWait}m`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{t('kpi_avg_wait_sub')}</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('kpi_completed_today')}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {isLoading ? '...' : completedToday}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{t('kpi_completed_today_sub')}</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('kpi_total_registered')}</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? '...' : totalRegistered}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{t('kpi_total_registered_sub')}</div>
        </div>
      </div>

      {/* Clinical Workflow Navigation & Department Quick Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            {t('overview_dept_title')}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('overview_dept_desc')}
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
                      {d.waiting_count} {t('tbl_waiting')}
                    </span>
                    <span className="text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded text-[11px] font-medium">
                      {d.in_consultation_count} {t('tbl_consulting')}
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
          <h3 className="text-sm font-bold text-slate-900">{t('overview_workflow_title')}</h3>
          <div className="space-y-2.5">
            <Link
              to="/intake"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                  {t('wf_intake_title')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t('wf_intake_sub')}</div>
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
                  {t('wf_queue_title')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t('wf_queue_sub')}</div>
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
                  {t('wf_analytics_title')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t('wf_analytics_sub')}</div>
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
                  {t('wf_audit_title')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t('wf_audit_sub')}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
