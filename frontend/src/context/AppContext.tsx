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
    // Navigation & App Header
    hospital_name: 'SehatSetu',
    hospital_tagline: 'Smart Patient Queue & Triage',
    hospital_ward: 'Civil Hospital • Ward A',
    clinical_ops: 'Clinical Operations',
    nav_overview: 'Overview',
    nav_intake: 'Register Patient',
    nav_queue: 'Patient Queue',
    nav_analytics: 'Analytics',
    nav_audit: 'Audit Log',
    duty_station: 'Duty Station',
    decision_support_title: 'Decision Support Only',
    decision_support_desc: 'Automated triage rankings are preliminary indicators and do not replace certified clinical judgment.',
    search_placeholder: 'Search patient by UHID, Name or Phone...',

    // Staff Roles
    role_doctor: 'Doctor (OPD/ER)',
    role_nurse: 'Triage Nurse',
    role_registration: 'Registration Desk',
    role_admin: 'Hospital Admin',

    // Urgency Categories
    urgency_critical: 'CRITICAL',
    urgency_high: 'HIGH',
    urgency_moderate: 'MODERATE',
    urgency_low: 'LOW',
    urgency_needs_review: 'NEEDS_REVIEW',

    // Visit Statuses
    status_waiting: 'WAITING',
    status_called: 'CALLED',
    status_in_consultation: 'IN_CONSULTATION',
    status_completed: 'COMPLETED',
    status_cancelled: 'CANCELLED',

    // Overview Page
    overview_title: 'Hospital Clinical Overview',
    overview_live_badge: 'Live Operations',
    overview_subtitle: 'Real-time patient intake monitoring, deterministic triage prioritisation, and active queue management.',
    btn_new_intake: 'New Patient Intake',
    btn_view_queue: 'View Active Queue',
    kpi_active_waiting: 'Active Waiting',
    kpi_active_waiting_sub: 'Awaiting triage call',
    kpi_critical: 'Critical Flagged',
    kpi_critical_sub: 'Immediate evaluation indicated',
    kpi_avg_wait: 'Avg Wait Time',
    kpi_avg_wait_sub: 'Calculated from verified arrivals',
    kpi_completed_today: 'Completed Today',
    kpi_completed_today_sub: 'Consultations finished',
    kpi_total_registered: 'Total Registered',
    kpi_total_registered_sub: 'Cumulative patient intakes',
    overview_dept_title: 'Specialty Departments Status',
    overview_dept_desc: 'Live patient loads currently distributed across emergency and outpatient clinical wings.',
    overview_workflow_title: 'Clinical Workflow Navigation',
    wf_intake_title: '1. Patient Intake & Triage Assessment',
    wf_intake_sub: 'Enter demographics, vitals, and chief complaints for rule evaluation',
    wf_queue_title: '2. Dynamic Prioritised Queue',
    wf_queue_sub: 'Call next patient, review vital signs, or perform doctor overrides',
    wf_analytics_title: '3. Operational Analytics & Inflow Trends',
    wf_analytics_sub: 'Visualise triage urgency distribution, hourly velocity, and wait metrics',
    wf_audit_title: '4. Immutable Audit & Compliance Log',
    wf_audit_sub: 'Review chronological clinician decisions, priority overrides, and timestamps',

    // Intake Page
    intake_title: 'Rapid Patient Intake & Emergency Triage',
    intake_subtitle: 'Enter patient demographics and vital observations for preliminary triage categorization.',
    synthetic_presets: 'Quick-Fill Synthetic Presets (Demonstration):',
    preset_critical: '🚨 Critical Scenario (Cardiac / SpO2 < 92%)',
    preset_high: '⚠️ High Urgency (Severe Fever / Tachycardia)',
    preset_low: '🟢 Low Urgency (Mild Back Strain)',
    sec_demographics: '1. Patient Demographics',
    sec_demographics_sub: 'Official hospital registration and contact parameters.',
    lbl_fullname: 'Full Patient Name',
    lbl_age: 'Age (Years)',
    lbl_gender: 'Biological Gender',
    gender_male: 'Male',
    gender_female: 'Female',
    gender_other: 'Other',
    lbl_phone: 'Contact Phone',
    lbl_emergency_phone: 'Emergency Contact Phone',
    lbl_dept: 'Target Department',
    lbl_address: 'Residential Address',
    sec_complaint: '2. Symptoms & Chief Complaint',
    sec_complaint_sub: 'Record direct patient statements, timeline, and aggravating factors.',
    btn_ai_assistant: 'AI Summary Assistant',
    sec_vitals: '3. Vital Sign Observations',
    sec_vitals_sub: 'Measured baseline vital parameters with standard clinical units.',
    lbl_preliminary_preview: 'Preliminary Urgency Preview:',
    lbl_bp_sys: 'BP Systolic (mmHg)',
    lbl_bp_dia: 'BP Diastolic (mmHg)',
    lbl_hr: 'Heart Rate (bpm)',
    lbl_rr: 'Respiratory Rate (/min)',
    lbl_spo2: 'SpO2 Oxygen (%)',
    lbl_temp: 'Temperature (°F)',
    lbl_glucose: 'Blood Glucose (mg/dL)',
    lbl_gcs: 'Glasgow Coma Scale (3-15)',
    btn_reset: 'Reset Form',
    btn_submit_intake: 'Submit Intake & Add to Queue',
    btn_submitting: 'Processing Triage & Saving...',
    success_modal_title: 'Patient Successfully Registered & Triaged',
    lbl_assigned_uhid: 'Assigned UHID',
    lbl_queue_pos: 'Queue Position',
    lbl_triage_category: 'Triage Category',
    lbl_calculated_score: 'Calculated Score',
    lbl_rule_evidence: 'Triage Rule Trigger Explanations:',
    btn_register_another: 'Register Another Patient',
    btn_go_to_queue: 'Go to Patient Queue',

    // Queue Page
    queue_title: 'Dynamic Patient Priority Queue',
    queue_subtitle: 'Prioritised in real-time by deterministic triage urgency and elapsed wait duration.',
    btn_call_next: '⚡ Call Next Patient',
    btn_calling_patient: 'Calling Patient...',
    filter_dept: 'Department:',
    all_depts: 'All Departments',
    tab_all: 'All Statuses',
    tab_waiting: 'Waiting',
    tab_called: 'Called',
    tab_consulting: 'In Consultation',
    tab_completed: 'Completed',
    urgency_filter: 'Urgency Filter:',
    col_rank: 'Rank',
    col_patient_uhid: 'Patient & UHID',
    col_urgency: 'Triage Urgency',
    col_wait: 'Wait Duration',
    col_priority_rank: 'Priority Rank',
    col_complaint_evidence: 'Chief Complaint & Evidence',
    col_actions: 'Actions',
    btn_review: 'Review',
    modal_vitals_title: 'Recorded Baseline Vitals',
    modal_reported_symptoms: 'Reported Symptoms:',
    modal_ai_assistant: 'AI Clinical Summary Assistant',
    btn_generate_ai: 'Generate AI Summary',
    modal_rule_exp: 'Triage Rule Explanations:',
    btn_override_urgency: 'Override Urgency Category',
    btn_mark_called: 'Mark as Called',
    btn_start_consultation: 'Start Consultation',
    btn_mark_completed: 'Mark Completed',
    btn_cancel_visit: 'Cancel Visit',
    override_dialog_title: 'Override Triage Urgency Category',
    override_target_cat: 'New Target Category',
    override_reason_lbl: 'Clinical Justification Reason',
    btn_confirm_override: 'Confirm Override',
    btn_saving_override: 'Saving Override...',

    // Analytics Page
    analytics_title: 'Hospital Operational Analytics',
    analytics_live_badge: 'Live Real-Time',
    analytics_subtitle: 'Real-time patient triage volume, waiting time thresholds, department loads, and intake velocity.',
    btn_refresh: 'Refresh Data',
    chart_triage_dist: 'Triage Distribution',
    chart_triage_dist_sub: 'Proportion of patients by urgency level',
    chart_inflow: 'Hourly Patient Inflow',
    chart_inflow_sub: 'Registration velocity across clinical shifts',
    chart_dept_load: 'Department Queue & Wait Times',
    chart_dept_load_sub: 'Active queue count and average wait duration by specialty',
    tbl_dept: 'Department',
    tbl_waiting: 'Waiting',
    tbl_consulting: 'In Consultation',
    tbl_completed: 'Completed Today',
    tbl_avg_wait: 'Avg Wait Time',

    // Audit Page
    audit_title: 'Clinical Audit & Compliance Log',
    audit_subtitle: 'Immutable record of patient registrations, triage assessments, status updates, and priority overrides.',
    audit_live_badge: 'Immutable Log',
    col_timestamp: 'Timestamp',
    col_action: 'Action Type',
    col_visit_id: 'Visit ID',
    col_new_state: 'State Details',
    col_reason: 'Justification / Reason',
  },
  hi: {
    // Navigation & App Header
    hospital_name: 'सेहत सेतु',
    hospital_tagline: 'स्मार्ट रोगी कतार एवं ट्राइएज प्रणाली',
    hospital_ward: 'सिविल अस्पताल • वार्ड ए',
    clinical_ops: 'चिकित्सीय संचालन (Operations)',
    nav_overview: 'अवलोकन (Overview)',
    nav_intake: 'रोगी पंजीकरण (Intake)',
    nav_queue: 'सक्रिय कतार (Queue)',
    nav_analytics: 'विश्लेषण (Analytics)',
    nav_audit: 'ऑडिट लॉग (Audit)',
    duty_station: 'ड्यूटी स्टेशन',
    decision_support_title: 'केवल निर्णय सहायता',
    decision_support_desc: 'स्वचालित ट्राइएज रैंकिंग प्रारंभिक संकेतक हैं और नैदानिक निर्णय का विकल्प नहीं हैं।',
    search_placeholder: 'रोगी को UHID, नाम या फोन से खोजें...',

    // Staff Roles
    role_doctor: 'चिकित्सक (Doctor)',
    role_nurse: 'ट्राइएज नर्स (Nurse)',
    role_registration: 'पंजीकरण डेस्क (Desk)',
    role_admin: 'अस्पताल प्रशासक (Admin)',

    // Urgency Categories
    urgency_critical: 'अति गंभीर (CRITICAL)',
    urgency_high: 'गंभीर (HIGH)',
    urgency_moderate: 'मध्यम (MODERATE)',
    urgency_low: 'सामान्य (LOW)',
    urgency_needs_review: 'पुनरावलोकन (NEEDS_REVIEW)',

    // Visit Statuses
    status_waiting: 'प्रतीक्षारत (WAITING)',
    status_called: 'बुलाया गया (CALLED)',
    status_in_consultation: 'परामर्श में (IN_CONSULTATION)',
    status_completed: 'पूर्ण (COMPLETED)',
    status_cancelled: 'रद्द (CANCELLED)',

    // Overview Page
    overview_title: 'अस्पताल चिकित्सीय अवलोकन',
    overview_live_badge: 'लाइव संचालन',
    overview_subtitle: 'वास्तविक समय में रोगी पंजीकरण, स्वचालित ट्राइएज प्राथमिकता और कतार प्रबंधन।',
    btn_new_intake: 'नया रोगी पंजीकरण',
    btn_view_queue: 'सक्रिय कतार देखें',
    kpi_active_waiting: 'सक्रिय प्रतीक्षारत',
    kpi_active_waiting_sub: 'बुलाए जाने की प्रतीक्षा में',
    kpi_critical: 'अति गंभीर चिन्हित',
    kpi_critical_sub: 'तत्काल जांच आवश्यक',
    kpi_avg_wait: 'औसत प्रतीक्षा समय',
    kpi_avg_wait_sub: 'सत्यापित आगमन से गणना',
    kpi_completed_today: 'आज पूर्ण हुए परामर्श',
    kpi_completed_today_sub: 'निपटाए गए परामर्श',
    kpi_total_registered: 'कुल पंजीकृत रोगी',
    kpi_total_registered_sub: 'आज के कुल पंजीकरण',
    overview_dept_title: 'विशेषज्ञ विभाग स्थिति',
    overview_dept_desc: 'आपातकालीन और ओपीडी विभागों में वितरित रोगी भार।',
    overview_workflow_title: 'चिकित्सीय कार्यप्रवाह नेविगेशन',
    wf_intake_title: '1. रोगी पंजीकरण एवं ट्राइएज मूल्यांकन',
    wf_intake_sub: 'जनसांख्यिकी, लक्षण और महत्वपूर्ण संकेतों का विवरण दर्ज करें',
    wf_queue_title: '2. गतिशील प्राथमिकता कतार',
    wf_queue_sub: 'अगले रोगी को बुलाएं, लक्षण जांचें या डॉक्टर प्राथमिकता बदलें',
    wf_analytics_title: '3. परिचालन विश्लेषण एवं आगमन प्रवृत्तियां',
    wf_analytics_sub: 'ट्राइएज वितरण, प्रति घंटा गति और प्रतीक्षा समय देखें',
    wf_audit_title: '4. अपरिवर्तनीय ऑडिट एवं अनुपालन रिकॉर्ड',
    wf_audit_sub: 'चिकित्सकीय निर्णयों, ओवरराइड और समय-मुहरों का संपूर्ण इतिहास',

    // Intake Page
    intake_title: 'त्वरित रोगी पंजीकरण एवं ट्राइएज',
    intake_subtitle: 'ट्राइएज वर्गीकरण के लिए रोगी जनसांख्यिकी और महत्वपूर्ण संकेतों का विवरण दर्ज करें।',
    synthetic_presets: 'नमूना त्वरित डेटा (डेमो के लिए):',
    preset_critical: '🚨 अति गंभीर स्थिति (हृदय रोग / SpO2 < 92%)',
    preset_high: '⚠️ गंभीर स्थिति (तेज बुखार / तीव्र धड़कन)',
    preset_low: '🟢 सामान्य स्थिति (हल्का कमर दर्द)',
    sec_demographics: '1. रोगी जनसांख्यिकी',
    sec_demographics_sub: 'अस्पताल पंजीकरण और संपर्क विवरण।',
    lbl_fullname: 'रोगी का पूरा नाम',
    lbl_age: 'आयु (वर्ष)',
    lbl_gender: 'लिंग',
    gender_male: 'पुरुष',
    gender_female: 'महिला',
    gender_other: 'अन्य',
    lbl_phone: 'संपर्क फोन',
    lbl_emergency_phone: 'आपातकालीन फोन',
    lbl_dept: 'लक्षित विभाग',
    lbl_address: 'घर का पता',
    sec_complaint: '2. लक्षण एवं मुख्य शिकायत',
    sec_complaint_sub: 'रोगी के बताए लक्षण, अवधि और बढ़ने के कारण दर्ज करें।',
    btn_ai_assistant: 'AI सारांश सहायक',
    sec_vitals: '3. महत्वपूर्ण संकेत (Vital Signs)',
    sec_vitals_sub: 'मानक नैदानिक इकाइयों में मापे गए संकेत।',
    lbl_preliminary_preview: 'प्रारंभिक ट्राइएज पूर्वावलोकन:',
    lbl_bp_sys: 'रक्तचाप सिस्टोलिक (BP Systolic)',
    lbl_bp_dia: 'रक्तचाप डायस्टोलिक (BP Diastolic)',
    lbl_hr: 'हृदय गति (Heart Rate - bpm)',
    lbl_rr: 'श्वसन दर (Respiratory Rate)',
    lbl_spo2: 'ऑक्सीजन (SpO2 %)',
    lbl_temp: 'तापमान (Temperature °F)',
    lbl_glucose: 'रक्त शर्करा (Blood Glucose mg/dL)',
    lbl_gcs: 'ग्लासगो कोमा स्केल (GCS 3-15)',
    btn_reset: 'फॉर्म रीसेट करें',
    btn_submit_intake: 'पंजीकरण जमा करें एवं कतार में जोड़ें',
    btn_submitting: 'ट्राइएज गणना एवं डेटा सहेजा जा रहा है...',
    success_modal_title: 'रोगी सफलतापूर्वक पंजीकृत एवं ट्राइएज संपन्न',
    lbl_assigned_uhid: 'आवंटित UHID टोकन',
    lbl_queue_pos: 'कतार स्थिति (Queue Position)',
    lbl_triage_category: 'ट्राइएज श्रेणी',
    lbl_calculated_score: 'प्राथमिकता अंक',
    lbl_rule_evidence: 'ट्राइएज नियम स्पष्टीकरण:',
    btn_register_another: 'अन्य रोगी पंजीकृत करें',
    btn_go_to_queue: 'सक्रिय कतार पर जाएं',

    // Queue Page
    queue_title: 'गतिशील प्राथमिकता रोगी कतार',
    queue_subtitle: 'ट्राइएज गंभीरता और प्रतीक्षा अवधि के आधार पर वास्तविक समय में व्यवस्थित।',
    btn_call_next: '⚡ अगले रोगी को बुलाएं',
    btn_calling_patient: 'रोगी को बुलाया जा रहा है...',
    filter_dept: 'विभाग चुनें:',
    all_depts: 'सभी विभाग',
    tab_all: 'सभी स्थितियां',
    tab_waiting: 'प्रतीक्षारत',
    tab_called: 'बुलाया गया',
    tab_consulting: 'परामर्श जारी',
    tab_completed: 'पूर्ण',
    urgency_filter: 'गंभीरता फ़िल्टर:',
    col_rank: 'क्रमांक',
    col_patient_uhid: 'रोगी एवं UHID टोकन',
    col_urgency: 'ट्राइएज गंभीरता',
    col_wait: 'प्रतीक्षा समय',
    col_priority_rank: 'प्राथमिकता अंक',
    col_complaint_evidence: 'लक्षण एवं नियम प्रमाण',
    col_actions: 'कार्रवाई',
    btn_review: 'समीक्षा करें',
    modal_vitals_title: 'दर्ज किए गए महत्वपूर्ण संकेत',
    modal_reported_symptoms: 'दर्ज लक्षण:',
    modal_ai_assistant: 'AI नैदानिक सारांश सहायक',
    btn_generate_ai: 'AI सारांश बनाएं',
    modal_rule_exp: 'ट्राइएज नियम स्पष्टीकरण:',
    btn_override_urgency: 'ट्राइएज श्रेणी बदलें (Override)',
    btn_mark_called: 'बुलाया गया अंकित करें',
    btn_start_consultation: 'परामर्श शुरू करें',
    btn_mark_completed: 'पूर्ण घोषित करें',
    btn_cancel_visit: 'रोगी यात्रा रद्द करें',
    override_dialog_title: 'ट्राइएज श्रेणी मैन्युअल रूप से बदलें',
    override_target_cat: 'नई लक्षित श्रेणी',
    override_reason_lbl: 'चिकित्सीय औचित्य का कारण',
    btn_confirm_override: 'बदलाव की पुष्टि करें',
    btn_saving_override: 'सहेजा जा रहा है...',

    // Analytics Page
    analytics_title: 'अस्पताल परिचालन विश्लेषण',
    analytics_live_badge: 'लाइव वास्तविक समय',
    analytics_subtitle: 'रोगी ट्राइएज वितरण, प्रतीक्षा समय, विभाग भार और आगमन वेग।',
    btn_refresh: 'डेटा ताज़ा करें',
    chart_triage_dist: 'ट्राइएज श्रेणी वितरण',
    chart_triage_dist_sub: 'गंभीरता स्तर के अनुसार रोगियों का अनुपात',
    chart_inflow: 'प्रति घंटा रोगी आगमन',
    chart_inflow_sub: 'पंजीकरण वेग एवं समय वितरण',
    chart_dept_load: 'विभाग कतार एवं प्रतीक्षा समय',
    chart_dept_load_sub: 'सक्रिय कतार संख्या और औसत प्रतीक्षा अवधि',
    tbl_dept: 'विभाग',
    tbl_waiting: 'प्रतीक्षारत',
    tbl_consulting: 'परामर्श में',
    tbl_completed: 'आज पूर्ण हुए',
    tbl_avg_wait: 'औसत प्रतीक्षा समय',

    // Audit Page
    audit_title: 'चिकित्सीय ऑडिट एवं अनुपालन रिकॉर्ड',
    audit_subtitle: 'रोगी पंजीकरण, ट्राइएज मूल्यांकन, स्थिति परिवर्तन और ओवरराइड का स्थायी रिकॉर्ड।',
    audit_live_badge: 'स्थायी लॉग',
    col_timestamp: 'समय',
    col_action: 'कार्रवाई प्रकार',
    col_visit_id: 'विज़िट आईडी',
    col_new_state: 'स्थिति विवरण',
    col_reason: 'कारण / औचित्य',
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
      message: language === 'hi'
        ? `[सेहत सेतु सूचना] प्रिय ${patientName}, आपका टोकन (${uhid}) ${room} में बुलाया गया है। कृपया तुरंत उपस्थित हों।`
        : `[SehatSetu Alert] Dear ${patientName}, your token (${uhid}) has been called to ${room}. Please proceed immediately.`,
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
