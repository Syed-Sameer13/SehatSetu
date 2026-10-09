import React from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquare, X, ExternalLink, Clock, Building2, CheckCircle2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SMSAlertToast: React.FC = () => {
  const { smsAlerts, dismissSmsAlert } = useApp();

  // Show the latest alert as a floating toast if available
  const latestAlert = smsAlerts.length > 0 ? smsAlerts[0] : null;

  if (!latestAlert) return null;

  const isCall = latestAlert.type === 'CALLED';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-md ${
          isCall
            ? 'bg-blue-900/95 text-white border-blue-400/50 shadow-blue-900/30'
            : 'bg-slate-900/95 text-white border-teal-500/50 shadow-teal-900/30'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isCall ? 'bg-blue-500 text-white animate-bounce' : 'bg-teal-500 text-slate-950'
              }`}
            >
              {isCall ? <Bell className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight">
                <span>{isCall ? 'PATIENT CALL BROADCAST' : 'PATIENT SMS DELIVERED'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-[10px] text-slate-300">
                To: <span className="font-mono text-white font-semibold">{latestAlert.phone}</span> • {latestAlert.timestamp}
              </div>
            </div>
          </div>

          <button
            onClick={() => dismissSmsAlert(latestAlert.id)}
            className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Patient Token & Department details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-white">{latestAlert.patientName}</span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 border border-white/20 text-teal-300">
              {latestAlert.uhid}
            </span>
          </div>

          {/* Department & Wait / Room Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {latestAlert.department && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200">
                <Building2 className="w-2.5 h-2.5 text-teal-400" />
                {latestAlert.department}
              </span>
            )}
            {latestAlert.estimatedWaitMinutes !== undefined && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-semibold">
                <Clock className="w-2.5 h-2.5 text-blue-300" />
                ~{latestAlert.estimatedWaitMinutes} mins wait
              </span>
            )}
            {latestAlert.room && (
              <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30 font-semibold">
                {latestAlert.room}
              </span>
            )}
          </div>

          {/* SMS Text Body */}
          <div className="p-2.5 rounded-lg bg-black/30 border border-white/10 font-mono text-[11px] text-slate-200 leading-snug">
            {latestAlert.message}
          </div>

          {/* Action Links */}
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              SMS Delivered via Gateway
            </span>
            <Link
              to={`/tracker?uhid=${latestAlert.uhid}`}
              onClick={() => dismissSmsAlert(latestAlert.id)}
              className="text-teal-300 hover:text-teal-100 font-bold underline flex items-center gap-1 cursor-pointer"
            >
              Open Live Tracker
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
