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
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StaffRole, AuthType } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    authType,
    setAuthType,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    loginAsStaff,
    loginAsPatient,
    language,
    setLanguage,
    t,
  } = useApp();

  // Primary Role & Auth Mode State
  const [activeTab, setActiveTab] = useState<AuthType>(authType || 'STAFF');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('DOCTOR');
  const [showPassword, setShowPassword] = useState(false);

  // Patient Quick Lookup
  const [patientInput, setPatientInput] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await loginWithGoogle(activeTab);
      if (res.success) {
        setSuccessMsg(
          language === 'hi'
            ? 'गूगल द्वारा प्रमाणीकरण सफल!'
            : language === 'te'
            ? 'గూగుల్ ద్వారా విజయవంతంగా లాగిన్ అయ్యారు!'
            : 'Successfully authenticated via Google!'
        );
        setTimeout(() => {
          if (activeTab === 'PATIENT') {
            navigate('/tracker');
          } else {
            navigate('/');
          }
        }, 600);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Auth encountered an error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !email.includes('@')) {
      setErrorMsg(
        language === 'hi'
          ? 'कृपया एक मान्य ईमेल पता दर्ज करें'
          : language === 'te'
          ? 'దయచేసి సరైన ఇమెయిల్ చిరునామాను నమోదు చేయండి'
          : 'Please enter a valid email address.'
      );
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg(
        language === 'hi'
          ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए'
          : language === 'te'
          ? 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'SIGNUP') {
        if (!fullName.trim()) {
          setErrorMsg(
            language === 'hi'
              ? 'कृपया अपना पूरा नाम दर्ज करें'
              : language === 'te'
              ? 'దయచేసి మీ పూర్తి పేరును నమోదు చేయండి'
              : 'Please enter your full name.'
          );
          setIsLoading(false);
          return;
        }

        const res = await signUpWithEmail(
          email,
          password,
          fullName,
          activeTab,
          activeTab === 'STAFF' ? staffRole : undefined,
          phoneNumber
        );

        if (res.success) {
          setSuccessMsg(
            language === 'hi'
              ? 'खाता सफलतापूर्वक बनाया गया! पोर्टल पर पुनर्निर्देशित किया जा रहा है...'
              : language === 'te'
              ? 'ఖాతా విజయవంతంగా సృష్టించబడింది! పోర్టల్‌కి వెళుతున్నాము...'
              : 'Account created successfully! Redirecting...'
          );
          setTimeout(() => {
            if (activeTab === 'PATIENT') {
              navigate('/tracker');
            } else {
              navigate('/');
            }
          }, 800);
        } else {
          setErrorMsg(res.error || 'Failed to create account.');
        }
      } else {
        // Sign In
        const res = await loginWithEmail(email, password, activeTab);
        if (res.success) {
          setSuccessMsg(
            language === 'hi'
              ? 'लॉगिन सफल! पोर्टल पर पुनर्निर्देशित किया जा रहा है...'
              : language === 'te'
              ? 'లాగిన్ విజయవంతమైంది! పోర్టల్‌కి వెళుతున్నాము...'
              : 'Login successful! Redirecting...'
          );
          setTimeout(() => {
            if (activeTab === 'PATIENT') {
              navigate('/tracker');
            } else {
              navigate('/');
            }
          }, 600);
        } else {
          setErrorMsg(res.error || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffQuickLogin = (selectedRole: StaffRole) => {
    loginAsStaff(selectedRole);
    navigate('/');
  };

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = patientInput.trim() || 'UHID-2026-0089';
    loginAsPatient(query, 'Registered Patient');
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
                v2.5 Pro
              </span>
            </h1>
            <p className="text-xs text-teal-300/80">{t('hospital_tagline')}</p>
          </div>
        </div>

        {/* Trilingual Language Toggle */}
        <div className="flex items-center bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 text-xs shadow-inner">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              language === 'hi'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLanguage('te')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
      <main className="relative z-10 w-full max-w-xl mx-auto px-4 py-6 flex-1 flex flex-col justify-center">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          
          {/* Card Title & Description */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Unified Clinical Auth & Patient Access</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {authMode === 'LOGIN'
                ? (activeTab === 'STAFF' ? 'Hospital Staff Portal' : 'Patient Live Pass & Triage')
                : (activeTab === 'STAFF' ? 'Register New Staff Account' : 'Register Patient Account')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {authMode === 'LOGIN'
                ? 'Sign in with Google, email credentials, or select a duty station.'
                : 'Create your verified account for secure hospital queue access.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl flex items-center gap-2.5 text-xs text-red-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-teal-950/60 border border-teal-500/50 rounded-xl flex items-center gap-2.5 text-xs text-teal-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Role Persona Segmented Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-4">
            <button
              onClick={() => {
                setActiveTab('STAFF');
                setAuthType('STAFF');
                setErrorMsg(null);
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
                setErrorMsg(null);
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

          {/* Sign In vs Sign Up Tabs Toggle */}
          <div className="flex border-b border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode('LOGIN');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                authMode === 'LOGIN'
                  ? 'border-teal-400 text-teal-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'hi' ? 'साइन इन (Sign In)' : language === 'te' ? 'సైన్ ఇన్ (Sign In)' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('SIGNUP');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                authMode === 'SIGNUP'
                  ? 'border-teal-400 text-teal-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'hi' ? 'नया खाता बनाएं (Sign Up)' : language === 'te' ? 'ఖాతా సృష్టించండి (Sign Up)' : 'Sign Up'}
            </button>
          </div>

          {/* Google OAuth One-Click Button */}
          <div className="mb-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-70 text-xs sm:text-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
              <span>
                {isLoading
                  ? 'Connecting to Google...'
                  : authMode === 'SIGNUP'
                  ? 'Sign up with Google'
                  : 'Continue with Google'}
              </span>
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              Or with Email & Password
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuthSubmit} className="space-y-3 mb-5">
            {authMode === 'SIGNUP' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-teal-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Sameer Khan or Aarav Sharma"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {activeTab === 'STAFF' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Staff Role / Duty Designation <span className="text-teal-400">*</span>
                    </label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="DOCTOR">Doctor (OPD / Emergency Duty)</option>
                      <option value="NURSE">Triage Nurse (Vitals & Queue Calling)</option>
                      <option value="REGISTRATION">Registration Desk Staff</option>
                      <option value="ADMIN">Hospital Medical Superintendant</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number (For SMS alerts)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91-9876543210"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address <span className="text-teal-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password <span className="text-teal-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-xs sm:text-sm"
            >
              <span>
                {isLoading
                  ? 'Processing Authentication...'
                  : authMode === 'SIGNUP'
                  ? 'Create Account & Sign In'
                  : 'Sign In to Portal'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Fast Logins for Staff */}
          {activeTab === 'STAFF' && authMode === 'LOGIN' && (
            <div className="space-y-2.5 pt-3 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-teal-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Instant Role Test Credentials</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStaffQuickLogin('DOCTOR')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-teal-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-white group-hover:text-teal-300">
                    🩺 Doctor (OPD/ER)
                  </div>
                  <div className="text-[10px] text-slate-400">Dr. Sameer Khan</div>
                </button>

                <button
                  onClick={() => handleStaffQuickLogin('NURSE')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-white group-hover:text-blue-300">
                    👩‍⚕️ Triage Nurse
                  </div>
                  <div className="text-[10px] text-slate-400">Priya Sharma</div>
                </button>

                <button
                  onClick={() => handleStaffQuickLogin('REGISTRATION')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    📋 Registration
                  </div>
                  <div className="text-[10px] text-slate-400">Ramesh Patel</div>
                </button>

                <button
                  onClick={() => handleStaffQuickLogin('ADMIN')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-white group-hover:text-purple-300">
                    🏛️ Admin
                  </div>
                  <div className="text-[10px] text-slate-400">Rajesh Verma</div>
                </button>
              </div>
            </div>
          )}

          {/* Quick Token Lookup for Patient */}
          {activeTab === 'PATIENT' && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-teal-400 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>Quick Token Search & Live Status</span>
              </div>

              <form onSubmit={handlePatientSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={patientInput}
                  onChange={(e) => setPatientInput(e.target.value)}
                  placeholder="e.g. UHID-2026-0089 or 21"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Track</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  loginAsPatient('UHID-2026-0089', 'Aarav Sharma');
                  navigate('/tracker?uhid=UHID-2026-0089');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-teal-950/40 hover:bg-teal-900/50 border border-teal-700/60 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-xs">
                    🎟️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-teal-200">
                      View Demo Patient Pass
                    </div>
                    <div className="text-[10px] text-teal-400/80 font-mono">UHID-2026-0089 • General Medicine</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Footer Clinical Boundary Notice */}
          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
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
