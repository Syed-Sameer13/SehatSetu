import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  QrCode,
  BarChart3,
  History,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { role, t } = useApp();

  const navItems = [
    { label: t('nav_overview'), path: '/', icon: LayoutDashboard },
    { label: t('nav_intake'), path: '/intake', icon: UserPlus },
    { label: t('nav_queue'), path: '/queue', icon: Users },
    { label: t('nav_tracker'), path: '/tracker', icon: QrCode },
    { label: t('nav_analytics'), path: '/analytics', icon: BarChart3 },
    { label: t('nav_audit'), path: '/audit', icon: History },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
          SS
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-none text-base">{t('hospital_name')}</h1>
          <span className="text-[11px] text-teal-700 font-medium">{t('hospital_tagline')}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {t('clinical_ops')}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 border-l-4 border-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Safety Notice Card */}
      <div className="p-4 m-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900">
        <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{t('decision_support_title')}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-700">
          {t('decision_support_desc')}
        </p>
      </div>

      {/* User / Station Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center text-xs font-bold">
            {role.substring(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {role === 'DOCTOR' && 'Dr. Duty Officer'}
              {role === 'NURSE' && 'Sister Staff Nurse'}
              {role === 'REGISTRATION' && 'Intake Desk Staff'}
              {role === 'ADMIN' && 'Medical Superintendant'}
            </span>
            <span className="text-[10px] text-teal-700 font-semibold">{t('duty_station')} • {t('hospital_ward')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
