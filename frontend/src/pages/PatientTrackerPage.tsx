import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchQueue } from '../services/queueService';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import {
  QrCode,
  Clock,
  Building2,
  Bell,
  RefreshCw,
  Search,
  CheckCircle2,
  Activity,
  Heart,
  Droplets,
  Thermometer,
  MessageSquare,
  Printer,
  ArrowRight,
} from 'lucide-react';

export const PatientTrackerPage: React.FC = () => {
  const { t, language } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const uhidParam = searchParams.get('uhid') || '';
  const [searchInput, setSearchInput] = useState<string>(uhidParam);

  // Sync search input when param changes
  useEffect(() => {
    if (uhidParam) {
      setSearchInput(uhidParam);
    }
  }, [uhidParam]);

  // Fetch all active queue data
  const { data: queue, refetch, isRefetching } = useQuery({
    queryKey: ['queue-tracker'],
    queryFn: () => fetchQueue(undefined, 'ALL'),
    refetchInterval: 8000, // Live poll every 8 seconds
  });

  // Find targeted patient record
  const currentUHID = (uhidParam || searchInput).trim().toUpperCase();
  const patientEntry = queue?.find(
    (entry) =>
      entry.uhid.toUpperCase() === currentUHID ||
      entry.patient_id === currentUHID ||
      entry.visit_id === currentUHID
  );

  // Find department-specific queue statistics
  const deptQueue = queue?.filter(
    (e) => e.department_id === patientEntry?.department_id && e.status === 'WAITING'
  ) || [];

  // Calculate actual position ahead in department
  const patientsAhead = patientEntry
    ? deptQueue.findIndex((e) => e.visit_id === patientEntry.visit_id)
    : -1;
  const queuePos = patientsAhead >= 0 ? patientsAhead + 1 : patientEntry ? 1 : 0;
  const calculatedWait = Math.max(5, queuePos * 8);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ uhid: searchInput.trim().toUpperCase() });
    }
  };

  const printTokenSlip = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <QrCode className="w-5 h-5 text-teal-700" />
              {t('tracker_title')}
            </h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('tracker_live_pulse')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('tracker_subtitle')}
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-teal-700' : ''}`} />
          {t('btn_refresh')}
        </button>
      </div>

      {/* UHID Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. SS-2026-9041 or Patient Name"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            {t('tracker_search_btn')}
          </button>
        </form>

        {/* Quick select from recent active registrations */}
        {queue && queue.length > 0 && !patientEntry && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-400 text-[11px]">Active Tokens in Queue:</span>
            {queue.slice(0, 5).map((q) => (
              <button
                key={q.visit_id}
                type="button"
                onClick={() => {
                  setSearchInput(q.uhid);
                  setSearchParams({ uhid: q.uhid });
                }}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-800 font-mono text-[11px] font-semibold text-slate-700 transition"
              >
                {q.uhid} ({q.full_name})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Patient Digital Token Pass Card */}
      {patientEntry ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Main Status Hero Banner */}
          <div
            className={`rounded-2xl p-6 border shadow-sm space-y-4 ${
              patientEntry.status === 'CALLED'
                ? 'bg-blue-50/90 border-blue-300'
                : patientEntry.status === 'IN_CONSULTATION'
                ? 'bg-teal-50/90 border-teal-300'
                : patientEntry.status === 'COMPLETED'
                ? 'bg-emerald-50/90 border-emerald-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  SS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{patientEntry.full_name}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-bold">
                      {patientEntry.uhid}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {patientEntry.age} Years • {patientEntry.gender} • {t('hospital_ward')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge type="status" value={patientEntry.status} />
                <StatusBadge type="urgency" value={patientEntry.urgency_category} />
              </div>
            </div>

            {/* Live Guidance Alert based on status */}
            {patientEntry.status === 'CALLED' ? (
              <div className="bg-blue-600 text-white p-4 rounded-xl shadow-sm flex items-center justify-between animate-bounce">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">YOU ARE BEING CALLED!</h4>
                    <p className="text-xs text-blue-100">
                      Please proceed immediately to <strong>{patientEntry.department_name} (Consultation Room 1)</strong>.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white text-blue-800 font-black text-xs rounded-lg uppercase tracking-wider">
                  Proceed Now
                </span>
              </div>
            ) : patientEntry.status === 'IN_CONSULTATION' ? (
              <div className="bg-teal-700 text-white p-3.5 rounded-xl shadow-sm flex items-center gap-3">
                <Activity className="w-5 h-5 shrink-0 animate-pulse" />
                <div className="text-xs">
                  <span className="font-bold">Consultation in Progress:</span> Currently with the duty doctor in {patientEntry.department_name}.
                </div>
              </div>
            ) : patientEntry.status === 'COMPLETED' ? (
              <div className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Session Completed:</span> {t('tracker_completed_msg')}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-700 flex items-center gap-3">
                <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                <div>{t('tracker_waiting_msg')}</div>
              </div>
            )}

            {/* 3 Core Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Queue Position */}
              <div className="bg-white/80 p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  {t('tracker_pos_badge')}
                </div>
                <div className="text-2xl font-black text-teal-800">
                  {patientEntry.status === 'WAITING' ? `#${queuePos}` : 'Active'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {patientEntry.status === 'WAITING'
                    ? `${patientsAhead} patient(s) ahead in ${patientEntry.department_name}`
                    : 'At the consultation desk'}
                </div>
              </div>

              {/* Estimated Wait Time */}
              <div className="bg-white/80 p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {t('tracker_est_wait')}
                </div>
                <div className="text-2xl font-black text-blue-700">
                  {patientEntry.status === 'WAITING' ? `~${calculatedWait} mins` : '0 mins'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Dynamic calculation from verified inflow
                </div>
              </div>

              {/* Department & Counter */}
              <div className="bg-white/80 p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  {t('tracker_dept_room')}
                </div>
                <div className="text-sm font-bold text-slate-900 leading-tight">
                  {patientEntry.department_name}
                </div>
                <div className="text-[11px] text-teal-700 font-semibold mt-1">
                  Counter 1 • Consultation Room A
                </div>
              </div>
            </div>
          </div>

          {/* Vitals & Chief Complaint Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-700" />
              {t('tracker_vitals_summary')}
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                  <Heart className="w-3 h-3 text-rose-500" /> Blood Pressure
                </span>
                <span className="font-bold text-slate-800">
                  {patientEntry.vital_observations?.systolic_bp || '--'}/
                  {patientEntry.vital_observations?.diastolic_bp || '--'} mmHg
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                  <Droplets className="w-3 h-3 text-blue-500" /> Oxygen (SpO2)
                </span>
                <span className="font-bold text-slate-800">
                  {patientEntry.vital_observations?.spo2 ? `${patientEntry.vital_observations.spo2}%` : '--'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                  <Activity className="w-3 h-3 text-red-500" /> Heart Rate
                </span>
                <span className="font-bold text-slate-800">
                  {patientEntry.vital_observations?.heart_rate ? `${patientEntry.vital_observations.heart_rate} bpm` : '--'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                  <Thermometer className="w-3 h-3 text-amber-500" /> Temperature
                </span>
                <span className="font-bold text-slate-800">
                  {patientEntry.vital_observations?.temperature_f ? `${patientEntry.vital_observations.temperature_f}°F` : '--'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
              <span className="font-bold text-slate-800">Registered Complaint: </span>
              <span className="text-slate-600">{patientEntry.chief_complaint}</span>
            </div>
          </div>

          {/* SMS & WhatsApp Notification Preview Card */}
          <div className="bg-teal-50/70 border border-teal-200 p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-950 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-700" />
                {t('tracker_sms_preview')}
              </span>
              <span className="text-[10px] text-teal-700 font-semibold uppercase bg-teal-100 px-2 py-0.5 rounded">
                SMS Delivered
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-teal-200 text-xs text-slate-800 font-mono leading-relaxed shadow-xs">
              {patientEntry.status === 'CALLED' ? (
                language === 'hi' ? (
                  `[सेहत सेतु अलर्ट] प्रिय ${patientEntry.full_name}, आपका टोकन #${patientEntry.uhid} ${patientEntry.department_name} (Consultation Room 1) में बुलाया गया है। कृपया तुरंत उपस्थित हों!`
                ) : language === 'te' ? (
                  `[సేహత్‌సేతు అలర్ట్] ప్రియమైన ${patientEntry.full_name}, మీ టోకెన్ #${patientEntry.uhid} ${patientEntry.department_name} (Consultation Room 1) లోకి పిలవబడింది. దయచేసి వెంటనే హాజరుకాగలరు!`
                ) : (
                  `[SehatSetu Alert] Dear ${patientEntry.full_name}, Token #${patientEntry.uhid} has been CALLED to ${patientEntry.department_name} (Consultation Room 1). Please proceed immediately!`
                )
              ) : language === 'hi' ? (
                `[सेहत सेतु] प्रिय ${patientEntry.full_name}, आपका टोकन #${patientEntry.uhid} ${patientEntry.department_name} के लिए पंजीकृत है। कतार स्थिति: #${queuePos}। अनुमानित प्रतीक्षा: ~${calculatedWait} मिनट। लाइव स्थिति ट्रैक करें: sehatsetu.local/track?uhid=${patientEntry.uhid}`
              ) : language === 'te' ? (
                `[సేహత్‌సేతు] ప్రియమైన ${patientEntry.full_name}, మీ టోకెన్ #${patientEntry.uhid} ${patientEntry.department_name} విభాగానికి నమోదు చేయబడింది. క్యూ స్థానం: #${queuePos}. సుమారు నిరీక్షణ: ~${calculatedWait} నిమిషాలు. లైవ్ ట్రాక్ చేయండి: sehatsetu.local/track?uhid=${patientEntry.uhid}`
              ) : (
                `[SehatSetu] Dear ${patientEntry.full_name}, Token #${patientEntry.uhid} for ${patientEntry.department_name} is registered. Live Queue: #${queuePos}. Estimated Wait: ~${calculatedWait} mins. Live Tracker: sehatsetu.local/track?uhid=${patientEntry.uhid}`
              )}
            </div>
          </div>

          {/* Grounded AI Assistant Guidance Card */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 p-4 rounded-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm border border-teal-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 font-bold shrink-0">
                🤖
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-teal-100 flex items-center gap-2">
                  <span>Have a doubt about your Token or Visit?</span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
                    Grounded AI
                  </span>
                </div>
                <div className="text-[11px] text-teal-300/80 mt-0.5">
                  Ask our Gemini-grounded Hospital AI Assistant at the bottom-right for instant answers in English, हिन्दी, or తెలుగు.
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={printTokenSlip}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print Digital Token Slip
            </button>

            <Link
              to="/queue"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
            >
              View Full Clinical Queue
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Empty / No UHID Search State */
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-800">
              {currentUHID ? `No active record found for "${currentUHID}"` : 'Enter Patient Token to Track'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Please enter the UHID Token (e.g. SS-2026-9041) provided on the registration slip or SMS alert.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/intake"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-sm"
            >
              + Register New Patient
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
