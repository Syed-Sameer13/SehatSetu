import React, { createContext, useContext, useState, ReactNode } from 'react';
import { StaffRole } from '../types';

export type Language = 'en' | 'hi';

export interface SMSAlert {
  id: string;
  uhid: string;
  patientName: string;
  phone: string;
  message: string;
  timestamp: string;
}

interface AppContextType {
  role: StaffRole;
  setRole: (role: StaffRole) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  smsAlerts: SMSAlert[];
  triggerCallAlert: (uhid: string, patientName: string, phone: string, room: string) => void;
  dismissSmsAlert: (id: string) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    hospital_name: 'SehatSetu',
    hospital_tagline: 'Smart Patient Queue & Triage',
    nav_overview: 'Overview',
    nav_intake: 'Register Patient',
    nav_queue: 'Patient Queue',
    nav_analytics: 'Analytics',
    nav_audit: 'Audit Log',
    role_doctor: 'Doctor',
    role_nurse: 'Triage Nurse',
    role_registration: 'Registration Desk',
    role_admin: 'Hospital Admin',
    call_next: 'Call Next Patient',
    urgency_critical: 'CRITICAL',
    urgency_high: 'HIGH',
    urgency_moderate: 'MODERATE',
    urgency_low: 'LOW',
    intake_title: 'Rapid Patient Intake & Triage',
    intake_subtitle: 'Enter patient demographics and vital observations for preliminary triage categorization.',
  },
  hi: {
    hospital_name: 'सेहत सेतु',
    hospital_tagline: 'स्मार्ट रोगी कतार एवं ट्राइएज प्रणाली',
    nav_overview: 'अवलोकन (Dashboard)',
    nav_intake: 'रोगी पंजीकरण (Register)',
    nav_queue: 'सक्रिय कतार (Queue)',
    nav_analytics: 'विश्लेषण (Analytics)',
    nav_audit: 'ऑडिट लॉग (Audit)',
    role_doctor: 'चिकित्सक (Doctor)',
    role_nurse: 'ट्राइएज नर्स (Nurse)',
    role_registration: 'पंजीकरण डेस्क (Desk)',
    role_admin: 'प्रशासक (Admin)',
    call_next: 'अगले रोगी को बुलाएं',
    urgency_critical: 'अति गंभीर (CRITICAL)',
    urgency_high: 'गंभीर (HIGH)',
    urgency_moderate: 'मध्यम (MODERATE)',
    urgency_low: 'सामान्य (LOW)',
    intake_title: 'त्वरित रोगी पंजीकरण एवं ट्राइएज',
    intake_subtitle: 'ट्राइएज वर्गीकरण के लिए रोगी जनसांख्यिकी और महत्वपूर्ण संकेतों का विवरण दर्ज करें।',
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// Web Audio API Ding-Dong Chime
function playHospitalChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // First tone (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    // Second tone (440.00 Hz - A4)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440.0, ctx.currentTime + 0.3);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 1.2);
  } catch (e) {
    console.log('[Chime Audio Notice] AudioContext not permitted without user gesture:', e);
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<StaffRole>('DOCTOR');
  const [language, setLanguage] = useState<Language>('en');
  const [smsAlerts, setSmsAlerts] = useState<SMSAlert[]>([]);

  const triggerCallAlert = (uhid: string, patientName: string, phone: string, room: string) => {
    playHospitalChime();

    const newAlert: SMSAlert = {
      id: Math.random().toString(36).substring(7),
      uhid,
      patientName,
      phone: phone || '+91-9876543210',
      message: `[SehatSetu Alert] Dear ${patientName}, your token (${uhid}) has been called to ${room}. Please proceed immediately.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setSmsAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
  };

  const dismissSmsAlert = (id: string) => {
    setSmsAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        language,
        setLanguage,
        smsAlerts,
        triggerCallAlert,
        dismissSmsAlert,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
