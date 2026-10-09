import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  Users,
  Clock,
  Activity,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { useApp } from '../context/AppContext';

const URGENCY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', // red-500
  HIGH: '#f97316',     // orange-500
  MODERATE: '#eab308', // yellow-500
  LOW: '#10b981',      // emerald-500
  NEEDS_REVIEW: '#64748b', // slate-500
};

export const AnalyticsPage: React.FC = () => {
  const { t } = useApp();
  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.getOverview(),
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingState message="Loading hospital operational analytics..." />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="py-8">
        <ErrorState
          title="Failed to Load Analytics"
          message={error instanceof Error ? error.message : 'Unable to connect to analytics service.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Transform urgency distribution for Pie Chart
  const pieData = Object.entries(analytics.urgency_distribution)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      name: category,
      value: count,
      color: URGENCY_COLORS[category] || '#94a3b8',
    }));

  // Department load data for Bar Chart
  const deptData = analytics.department_load.map((d) => ({
    name: d.department_name.replace('Department', '').replace('General', 'Gen').trim(),
    waiting: d.waiting_count,
    consulting: d.in_consultation_count,
    completed: d.completed_today,
    avgWait: d.avg_wait_minutes,
  }));

  // Hourly trend data for Area Chart
  const hourlyData = analytics.hourly_intake_trend.map((h) => ({
    hour: h.hour_label,
    patients: h.patient_count,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {t('analytics_title')}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {t('analytics_live_badge')}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('analytics_subtitle')}
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : t('btn_refresh')}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t('kpi_total_registered')}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{analytics.total_registered_today}</span>
            <span className="text-xs text-slate-500 font-medium">{t('today')}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t('kpi_active_waiting')}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{analytics.currently_waiting}</span>
            <span className="text-xs text-slate-500 font-medium">pts</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t('tbl_consulting')}</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-600">{analytics.in_consultation}</span>
            <span className="text-xs text-slate-500 font-medium">active</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t('kpi_completed_today')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{analytics.completed_today}</span>
            <span className="text-xs text-slate-500 font-medium">discharged</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t('kpi_avg_wait')}</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{analytics.average_wait_time_minutes}</span>
            <span className="text-xs text-slate-500 font-medium">mins</span>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Triage Urgency Distribution (Pie) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('chart_triage_dist')}</h3>
              <p className="text-[11px] text-slate-400">{t('chart_triage_dist_sub')}</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>

          <div className="h-64 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value?: unknown, name?: unknown) => [`${value ?? 0} Patients`, String(name ?? '')]}
                    contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No active triage data recorded yet.</div>
            )}
          </div>
        </div>

        {/* Hourly Intake Volume (Area Chart) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('chart_inflow')}</h3>
              <p className="text-[11px] text-slate-400">{t('chart_inflow_sub')}</p>
            </div>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                  formatter={(value?: unknown) => [`${value ?? 0} Registrations`, 'Arrivals']}
                />
                <Area
                  type="monotone"
                  dataKey="patients"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPatients)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Load Breakdown Bar Chart & Table */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('chart_dept_load')}</h3>
            <p className="text-[11px] text-slate-400">{t('chart_dept_load_sub')}</p>
          </div>
          <Building2 className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="waiting" name={t('tbl_waiting')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consulting" name={t('tbl_consulting')} fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name={t('tbl_completed')} fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">{t('tbl_dept')}</th>
                <th className="py-2.5 px-4 text-center">{t('tbl_waiting')}</th>
                <th className="py-2.5 px-4 text-center">{t('tbl_consulting')}</th>
                <th className="py-2.5 px-4 text-center">{t('tbl_completed')}</th>
                <th className="py-2.5 px-4 text-right">{t('tbl_avg_wait')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {analytics.department_load.map((d) => (
                <tr key={d.department_id} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{d.department_name}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      {d.waiting_count}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      {d.in_consultation_count}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center text-emerald-700">{d.completed_today}</td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    {d.avg_wait_minutes > 0 ? `${d.avg_wait_minutes} mins` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
