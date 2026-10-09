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
  const { role, authType, currentUser, t } = useApp();

  // Links for Hospital Staff Suite
  const staffNavItems = [
    { label: t('nav_overview'), path: '/', icon: LayoutDashboard },
    { label: t('nav_intake'), path: '/intake', icon: UserPlus },
    { label: t('nav_queue'), path: '/queue', icon: Users },
    { label: t('nav_tracker'), path: '/tracker', icon: QrCode },
    { label: t('nav_analytics'), path: '/analytics', icon: BarChart3 },
    { label: t('nav_audit'), path: '/audit', icon: History },
  ];

  // Links for Patient / Attendant Portal
  const patientNavItems = [
    { label: t('patient_my_token'), path: '/tracker', icon: QrCode },
    { label: t('nav_overview'), path: '/', icon: LayoutDashboard },
  ];

  const currentNavItems = authType === 'PATIENT' ? patientNavItems : staffNavItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
          SS
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-none text-base">{t('hospital_name')}</h1>
          <span className="text-[11px] text-teal-700 font-medium">
            {authType === 'PATIENT' ? t('patient_portal_title') : t('hospital_tagline')}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {authType === 'PATIENT' ? 'Patient Portal' : t('clinical_ops')}
        </div>
        {currentNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 border-l-4 border-teal-700 font-bold'
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

      {/* Role Banner / Helpful Notice */}
      {authType === 'PATIENT' ? (
        <div className="p-4 m-3 bg-teal-50/80 border border-teal-200/80 rounded-xl text-xs text-teal-900">
          <div className="flex items-center gap-1.5 font-bold text-teal-900 mb-1">
            <QrCode className="w-4 h-4 text-teal-700" />
            <span>{t('patient_emergency')}</span>
          </div>
          <p className="text-[11px] text-teal-800 leading-relaxed">
            Emergency Ambulance: <strong className="text-teal-950">108</strong> / <strong className="text-teal-950">102</strong>
          </p>
          <p className="text-[10px] text-teal-700 mt-1">
            Civil Hospital Emergency Desk: 011-2399-4400
          </p>
        </div>
      ) : (
        <div className="p-4 m-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{t('decision_support_title')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-700">
            {t('decision_support_desc')}
          </p>
        </div>
      )}

      {/* User / Station Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center text-xs font-bold">
            {authType === 'PATIENT'
              ? 'PT'
              : role.substring(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {authType === 'PATIENT'
                ? currentUser?.name || 'Patient User'
                : role === 'DOCTOR'
                ? 'Dr. Duty Officer'
                : role === 'NURSE'
                ? 'Sister Staff Nurse'
                : role === 'REGISTRATION'
                ? 'Intake Desk Staff'
                : 'Medical Superintendant'}
            </span>
            <span className="text-[10px] text-teal-700 font-semibold">
              {authType === 'PATIENT'
                ? `Token: ${currentUser?.uhid || 'UHID-2026-0089'}`
                : `${t('duty_station')} • ${t('hospital_ward')}`}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
