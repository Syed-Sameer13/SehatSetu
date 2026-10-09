import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bot,
  Send,
  X,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Search,
  Ticket,
} from 'lucide-react';
import { fetchQueue } from '../../services/queueService';
import { aiService } from '../../services/aiService';
import { useApp } from '../../context/AppContext';
import { PatientAssistantResponse } from '../../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  needsConsultation?: boolean;
  suggestedAction?: string;
}

export const PatientAIAssistantWidget: React.FC = () => {
  const { language, setLanguage, currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch live queue data to provide real-time patient context
  const { data: queue } = useQuery({
    queryKey: ['queue-assistant-live'],
    queryFn: () => fetchQueue(undefined, 'ALL'),
    refetchInterval: 8000,
  });

  // Calculate live patient stats
  const activeUhid = currentUser?.uhid || (queue && queue[0] ? queue[0].uhid : 'SS-2026-0001');
  const liveEntry = queue?.find((e) => e.uhid.toUpperCase() === activeUhid.toUpperCase());
  const deptQueue = queue?.filter(
    (e) => e.department_id === liveEntry?.department_id && e.status === 'WAITING'
  ) || [];
  const patientRank = liveEntry
    ? deptQueue.findIndex((e) => e.visit_id === liveEntry.visit_id) + 1
    : 1;
  const liveWaitMins = Math.max(5, (patientRank || 1) * 8);

  // Initialize with greeting
  useEffect(() => {
    const greetingText =
      language === 'hi'
        ? `नमस्ते ${currentUser?.name || ''}! मैं सेहत सेतु का आधिकारिक अस्पताल सहायक हूँ।\nआप किसी भी टोकन ID (जैसे: ${activeUhid}), प्रतीक्षा समय, डॉक्टर कक्ष या अस्पताल नियमों के बारे में पूछ सकते हैं।`
        : language === 'te'
        ? `నమస్కారం ${currentUser?.name || ''}! నేను సేహత్‌సేతు అధికారిక ఆసుపత్రి సహాయకుడిని.\nమీరు ఏదైనా టోకెన్ ID (ఉదా: ${activeUhid}), నిరీక్షణ సమయం, డాక్టర్ గది లేదా ఆసుపత్రి వివరాల గురించి అడగవచ్చు.`
        : `Hello ${currentUser?.name || ''}! I am the SehatSetu Hospital Assistant.\nAsk me about any Token ID (e.g. ${activeUhid}), queue wait times, doctor rooms, or hospital guidelines.`;

    setMessages([
      {
        id: 'init-1',
        sender: 'assistant',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['Hospital Live Database', 'Ward A Queue Protocols'],
      },
    ]);
  }, [language, currentUser, activeUhid]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    {
      label: language === 'hi' ? `🎫 टोकन स्थिति (${activeUhid})` : language === 'te' ? `🎫 టోకెన్ స్థితి (${activeUhid})` : `🎫 Check Token (${activeUhid})`,
      query: `What are the details and status for token ${activeUhid}?`,
    },
    {
      label: language === 'hi' ? '⏱️ प्रतीक्षा समय कितना है?' : language === 'te' ? '⏱️ నిరీక్షణ సమయం ఎంత?' : '⏱️ What is my wait time?',
      query: `What is the queue rank and estimated wait time for token ${activeUhid}?`,
    },
    {
      label: language === 'hi' ? '🏥 कौन सा कमरा / विभाग है?' : language === 'te' ? '🏥 ఏ గది / విభాగం?' : '🏥 Which room to go?',
      query: `Which consultation room and floor is assigned for token ${activeUhid}?`,
    },
    {
      label: language === 'hi' ? '⚖️ ट्राइएज प्राथमिकता नियम' : language === 'te' ? '⚖️ ట్రయాజ్ ప్రాధాన్యత నిబంధనలు' : '⚖️ Triage Priority Rules',
      query: 'How does SehatSetu determine patient triage priority in the queue?',
    },
    {
      label: language === 'hi' ? '📋 कौन से दस्तावेज लाएं?' : language === 'te' ? '📋 ఏ పత్రాలు తీసుకురావాలి?' : '📋 Documents to bring',
      query: 'What documents or records should I keep ready for consultation?',
    },
    {
      label: language === 'hi' ? '🚨 24x7 इमरजेंसी नंबर' : language === 'te' ? '🚨 24x7 ఎమర్జెన్సీ నంబర్లు' : '🚨 Emergency Hotline',
      query: 'What are the 24x7 emergency contacts and ambulance numbers?',
    },
    {
      label: language === 'hi' ? '💊 क्या आप दवा लिख सकते हैं?' : language === 'te' ? '💊 మీరు మందులు ఇవ్వగలరా?' : '💊 Can you prescribe medicine?',
      query: 'Can you prescribe medicine or dosage for my fever?',
    },
  ];

  const handleSend = async (queryText?: string, specificToken?: string) => {
    const textToSend = (queryText || inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const tokenToQuery = specificToken || activeUhid;

    try {
      const res: PatientAssistantResponse = await aiService.askPatientAssistant({
        question: textToSend,
        language: language,
        patient_uhid: tokenToQuery,
        patient_context: {
          queue_position: patientRank > 0 ? patientRank : 1,
          estimated_wait_minutes: liveWaitMins,
          department_name: liveEntry?.department_name || 'General Medicine',
          status: liveEntry?.status || 'WAITING',
          uhid: tokenToQuery,
        },
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.grounded_sources,
        needsConsultation: res.needs_staff_consultation,
        suggestedAction: res.suggested_action,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[Patient AI Error]', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text:
          language === 'hi'
            ? 'सर्वर से संपर्क करने में असमर्थ। कृपया अस्पताल हेल्पडेस्क या डॉक्टर से सीधे संपर्क करें।'
            : language === 'te'
            ? 'సర్వర్ కనెక్ట్ కాలేదు. దయచేసి రిజిస్ట్రేషన్ డెస్క్ లేదా డాక్టర్‌ను సంప్రదించండి.'
            : 'Unable to connect to assistant service. Please consult the registration desk staff directly.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        needsConsultation: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;
    const query =
      language === 'hi'
        ? `टोकन ${token} की स्थिति और जानकारी क्या है?`
        : language === 'te'
        ? `టోకెన్ ${token} వివరాలు మరియు స్థితి ఏమిటి?`
        : `What are the patient details, queue status, and wait time for token ${token}?`;

    setTokenInput('');
    handleSend(query, token);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-700 to-teal-900 hover:from-teal-800 hover:to-teal-950 text-white rounded-full shadow-2xl shadow-teal-950/40 border border-teal-400/40 font-bold text-xs sm:text-sm transition-all transform hover:scale-105 active:scale-95 cursor-pointer group"
          aria-label="Open Grounded Hospital AI Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-teal-300 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </div>
          <span>
            {language === 'hi' ? 'AI टोकन व अस्पताल सहायक' : language === 'te' ? 'AI టోకెన్ & ఆసుపత్రి సహాయకుడు' : 'Ask Hospital AI & Token'}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </button>
      </div>

      {/* Slide-in Chat Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-[410px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-700/80 border border-teal-400/30 flex items-center justify-center text-teal-200 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5 leading-tight">
                  <span>Patient AI Assistant</span>
                  <span className="text-[9px] bg-teal-600/80 text-teal-200 px-1.5 py-0.2 rounded-full border border-teal-400/20 uppercase font-mono">
                    Grounded
                  </span>
                </div>
                <div className="text-[10px] text-teal-300/80 flex items-center gap-1">
                  <span>Civil Hospital • Ward A</span>
                  <span className="text-teal-400">•</span>
                  <span className="text-amber-300 font-mono font-medium">Token Lookup Ready</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switch */}
              <div className="flex items-center bg-teal-950/60 p-0.5 rounded-lg border border-teal-700/40 text-[10px]">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-1.5 py-0.5 rounded ${language === 'en' ? 'bg-teal-600 text-white font-bold' : 'text-teal-300'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('hi')}
                  className={`px-1.5 py-0.5 rounded ${language === 'hi' ? 'bg-teal-600 text-white font-bold' : 'text-teal-300'}`}
                >
                  हिन्दी
                </button>
                <button
                  onClick={() => setLanguage('te')}
                  className={`px-1.5 py-0.5 rounded ${language === 'te' ? 'bg-teal-600 text-white font-bold' : 'text-teal-300'}`}
                >
                  తెలుగు
                </button>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-teal-300 hover:text-white hover:bg-teal-800/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Token ID Lookup Bar */}
          <form
            onSubmit={handleTokenLookupSubmit}
            className="bg-teal-950/90 p-2 px-3 border-b border-teal-800 flex items-center gap-2 text-xs flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 text-teal-200 font-semibold shrink-0 text-[11px]">
              <Ticket className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'hi' ? 'टोकन खोजें:' : language === 'te' ? 'టోకెన్ శోధన:' : 'Token ID:'}</span>
            </div>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={language === 'hi' ? 'उदा: SS-2026-0001 या 1' : language === 'te' ? 'ఉదా: SS-2026-0001 లేదా 1' : 'e.g. SS-2026-0001 or 1'}
              className="flex-1 px-2.5 py-1 text-[11px] bg-teal-900/80 border border-teal-700/60 rounded-lg text-white placeholder:text-teal-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
            />
            <button
              type="submit"
              disabled={!tokenInput.trim() || isLoading}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-[11px] rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              <span>{language === 'hi' ? 'देखें' : language === 'te' ? 'చూడండి' : 'Check'}</span>
            </button>
          </form>

          {/* Safety Boundary Sub-header */}
          <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200/80 flex items-center gap-1.5 text-[10px] text-amber-900 font-medium flex-shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span className="truncate">Grounded hospital & token information • Strictly no drug prescriptions</span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs whitespace-pre-wrap leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-teal-700 text-white rounded-br-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {m.text}

                  {/* Consultation / Doctor Required Warning Badge */}
                  {m.needsConsultation && (
                    <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 flex items-start gap-1.5 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div>Clinical Consultation Required</div>
                        <div className="text-[10px] text-rose-700 font-normal mt-0.5">
                          {m.suggestedAction || 'Please consult the on-duty doctor or nurse directly.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grounded Sources Tag */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-1 text-[9px] text-slate-400">
                      <span className="font-semibold text-slate-500">Source:</span>
                      {m.sources.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 px-1 mt-0.5">{m.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 max-w-[75%] text-xs text-slate-500 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                <span>Searching verified hospital records & queue data...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 scrollbar-none flex-shrink-0">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp.query)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 border border-slate-200 transition-colors cursor-pointer flex-shrink-0"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'टोकन या अस्पताल संबंधी प्रश्न पूछें...'
                  : language === 'te'
                  ? 'టోకెన్ లేదా ఆసుపత్రి ప్రశ్నలను అడగండి...'
                  : 'Ask about token status, wait time, rooms...'
              }
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};

export default PatientAIAssistantWidget;
