import React, { useState } from 'react';
import { Bell, Search, Hospital, UserCheck, MessageSquare, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StaffRole } from '../../types';

export const TopNavbar: React.FC = () => {
  const { role, setRole, language, setLanguage, smsAlerts, dismissSmsAlert, t } = useApp();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const roles: Array<{ id: StaffRole; label: string; color: string }> = [
    { id: 'DOCTOR', label: t('role_doctor'), color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'NURSE', label: t('role_nurse'), color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'REGISTRATION', label: t('role_registration'), color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'ADMIN', label: t('role_admin'), color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 relative">
      {/* Search / Context */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient by UHID, Name or Phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Right Controls & Role / Language Selectors */}
      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
              language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
              language === 'hi' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            हिन्दी
          </button>
        </div>

        {/* Staff Role Switcher */}
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hospital Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <Hospital className="w-3.5 h-3.5 text-teal-700" />
          <span className="font-medium text-slate-700">Civil Hospital • Ward A</span>
        </div>

        {/* SMS / Patient Alert Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            aria-label="Notifications"
            className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {smsAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {/* Alert Popover */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <span>Patient SMS & Chime Broadcasts</span>
                </div>
                <button
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {smsAlerts.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No recent patient call broadcasts.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {smsAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-teal-50/60 border border-teal-200/80 p-2.5 rounded-lg text-xs space-y-1 relative"
                    >
                      <button
                        onClick={() => dismissSmsAlert(alert.id)}
                        className="absolute top-2 right-2 text-teal-600 hover:text-teal-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="font-bold text-teal-900 flex items-center justify-between pr-4">
                        <span>{alert.patientName}</span>
                        <span className="text-[10px] text-teal-700 font-mono">{alert.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-teal-800 leading-snug">{alert.message}</p>
                      <div className="text-[10px] text-teal-600 font-medium">To: {alert.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
