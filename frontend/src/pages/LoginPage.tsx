import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  UserCheck,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Hospital,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StaffRole, AuthType } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    authType,
    setAuthType,
    loginWithGoogle,
    loginAsStaff,
    loginAsPatient,
    language,
    setLanguage,
    t,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AuthType>(authType || 'STAFF');
  const [patientInput, setPatientInput] = useState('');
  const [patientNameInput, setPatientNameInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle(activeTab);
      if (activeTab === 'PATIENT') {
        navigate('/tracker');
      } else {
        navigate('/');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffQuickLogin = (selectedRole: StaffRole) => {
    loginAsStaff(selectedRole);
    navigate('/');
  };

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = patientInput.trim() || 'UHID-2026-0089';
    const name = patientNameInput.trim() || 'Aarav Sharma';
    loginAsPatient(query, name);
    navigate(`/tracker?uhid=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex flex-col justify-between text-slate-100 selection:bg-teal-500 selection:text-white relative overflow-hidden">
      {/* Background Subtle Grid & Glow Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(13,148,136,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-teal-900/40 border border-teal-300/30">
            SS
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-tight flex items-center gap-2">
              {t('hospital_name')}
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                v2.4
              </span>
            </h1>
            <p className="text-xs text-teal-300/80">{t('hospital_tagline')}</p>
          </div>
        </div>

        {/* Trilingual Toggle */}
        <div className="flex items-center bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 text-xs shadow-inner">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              language === 'en'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              language === 'hi'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLanguage('te')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              language === 'te'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            తెలుగు
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 w-full max-w-lg mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          
          {/* Card Title & Description */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Secure Authentication & Role Access</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('auth_login_title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t('auth_login_subtitle')}
            </p>
          </div>

          {/* Role Mode Segmented Selector */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
            <button
              onClick={() => {
                setActiveTab('STAFF');
                setAuthType('STAFF');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'STAFF'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50 border border-teal-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>{t('auth_tab_staff')}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('PATIENT');
                setAuthType('PATIENT');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'PATIENT'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50 border border-teal-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{t('auth_tab_patient')}</span>
            </button>
          </div>

          {/* Google OAuth Button */}
          <div className="mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-70 text-sm"
            >
              {/* Google SVG Icon */}
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoggingIn ? 'Connecting to Google Auth...' : t('auth_google_btn')}</span>
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              Or Fast 1-Click Access
            </span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          {/* STAFF LOGIN VIEW */}
          {activeTab === 'STAFF' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="text-xs font-semibold text-teal-400 mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t('auth_quick_demo')}</span>
              </div>

              {/* Doctor Button */}
              <button
                onClick={() => handleStaffQuickLogin('DOCTOR')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-teal-500/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold group-hover:scale-105 transition-transform">
                    🩺
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                      {t('auth_doctor_login')}
                    </div>
                    <div className="text-[11px] text-slate-400">Dr. Sameer Khan • OPD/ER Duty</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Nurse Button */}
              <button
                onClick={() => handleStaffQuickLogin('NURSE')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold group-hover:scale-105 transition-transform">
                    👩‍⚕️
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                      {t('auth_nurse_login')}
                    </div>
                    <div className="text-[11px] text-slate-400">Priya Sharma • Triage Desk</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Registration Desk Button */}
              <button
                onClick={() => handleStaffQuickLogin('REGISTRATION')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold group-hover:scale-105 transition-transform">
                    📋
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Registration Desk Staff
                    </div>
                    <div className="text-[11px] text-slate-400">Ramesh Patel • Reception Intake</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Admin Button */}
              <button
                onClick={() => handleStaffQuickLogin('ADMIN')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold group-hover:scale-105 transition-transform">
                    🏛️
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      {t('auth_admin_login')}
                    </div>
                    <div className="text-[11px] text-slate-400">Rajesh Verma • Medical Superintendant</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          )}

          {/* PATIENT LOGIN VIEW */}
          {activeTab === 'PATIENT' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <form onSubmit={handlePatientSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Patient Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={patientNameInput}
                    onChange={(e) => setPatientNameInput(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    UHID Token / Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={patientInput}
                      onChange={(e) => setPatientInput(e.target.value)}
                      placeholder="e.g. UHID-2026-0089 or 9876543210"
                      className="w-full pl-3.5 pr-24 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Track</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    loginAsPatient('UHID-2026-0089', 'Aarav Sharma');
                    navigate('/tracker?uhid=UHID-2026-0089');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-teal-950/40 hover:bg-teal-900/50 border border-teal-700/60 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-teal-200">
                        {t('auth_patient_demo_btn')}
                      </div>
                      <div className="text-[11px] text-teal-400/80 font-mono">Token: UHID-2026-0089 • General Medicine</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Footer Clinical Boundary Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>HIPAA & Ayushman Bharat Compliant</span>
            </div>
            <span className="font-semibold text-slate-400">Civil Hospital • Ward A</span>
          </div>

        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/80">
        <div>
          © 2026 {t('hospital_name')} — Smart Patient Queue & Emergency Triage.
        </div>
        <div className="flex items-center gap-4 text-slate-300 font-medium">
          <span className="flex items-center gap-1">
            <Hospital className="w-3 h-3 text-teal-400" />
            24x7 Emergency Help: 108 / 102
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
