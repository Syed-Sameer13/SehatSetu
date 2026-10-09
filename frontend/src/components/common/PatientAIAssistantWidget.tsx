import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    const greetingText =
      language === 'hi'
        ? `नमस्ते ${currentUser?.name || ''}! मैं सेहत सेतु का अस्पताल सूचना सहायक हूँ। आप टोकन, प्रतीक्षा समय, विभाग या अस्पताल नियमों के बारे में कोई भी प्रश्न पूछ सकते हैं।`
        : language === 'te'
        ? `నమస్కారం ${currentUser?.name || ''}! నేను సేహత్‌సేతు ఆసుపత్రి సహాయకుడిని. టోకెన్, నిరీక్షణ సమయం, గదుల వివరాలు లేదా ఆసుపత్రి మార్గదర్శకాలపై ఏవైనా సందేహాలు అడగవచ్చు.`
        : `Hello ${currentUser?.name || ''}! I am the SehatSetu Patient Information Assistant. Ask me anything about your token, waiting times, departments, or hospital guidelines.`;

    setMessages([
      {
        id: 'init-1',
        sender: 'assistant',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['Civil Hospital Operational Guide'],
      },
    ]);
  }, [language, currentUser]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    {
      label: language === 'hi' ? '⏱️ प्रतीक्षा समय कितना है?' : language === 'te' ? '⏱️ నిరీక్షణ సమయం ఎంత?' : '⏱️ What is my wait time?',
      query: 'What is my current queue rank and estimated wait time?',
    },
    {
      label: language === 'hi' ? '🏥 इमरजेंसी कक्ष कहाँ है?' : language === 'te' ? '🏥 ఎమర్జెన్సీ గది ఎక్కడ ఉంది?' : '🏥 Where is Emergency Room?',
      query: 'Where is the Emergency Room located in Ward A?',
    },
    {
      label: language === 'hi' ? '📋 कौन से दस्तावेज लाएं?' : language === 'te' ? '📋 ఏ పత్రాలు తీసుకురావాలి?' : '📋 What documents to bring?',
      query: 'What documents or records should I keep ready for consultation?',
    },
    {
      label: language === 'hi' ? '🩺 सामान्य SpO2 ऑक्सीजन क्या है?' : language === 'te' ? '🩺 సాధారణ ఆక్సిజన్ ఎంత ఉండాలి?' : '🩺 What is normal SpO2?',
      query: 'What are normal baseline vital ranges for oxygen and pulse?',
    },
    {
      label: language === 'hi' ? '💊 क्या आप बुखार की दवा लिख सकते हैं?' : language === 'te' ? '💊 మీరు జ్వరానికి మందులు ఇవ్వగలరా?' : '💊 Can you prescribe medicine?',
      query: 'Can you prescribe medicine or dosage for my fever?',
    },
  ];

  const handleSend = async (queryText?: string) => {
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

    try {
      const res: PatientAssistantResponse = await aiService.askPatientAssistant({
        question: textToSend,
        language: language,
        patient_uhid: currentUser?.uhid || 'UHID-2026-0089',
        patient_context: {
          queue_position: 2,
          estimated_wait_minutes: 15,
          department_name: 'General Medicine',
          uhid: currentUser?.uhid || 'UHID-2026-0089',
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
            {language === 'hi' ? 'AI सहायक से पूछें' : language === 'te' ? 'AI సహాయకుడిని అడగండి' : 'Ask Hospital AI'}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </button>
      </div>

      {/* Slide-in Chat Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-96 max-w-[calc(100vw-2rem)] h-[560px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-4 flex items-center justify-between flex-shrink-0">
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
                <div className="text-[10px] text-teal-300/80">Civil Hospital • Ward A</div>
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

          {/* Safety Boundary Sub-header */}
          <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200/80 flex items-center gap-1.5 text-[10px] text-amber-900 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span className="truncate">Grounded hospital information only • No medical prescriptions</span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs whitespace-pre-wrap leading-relaxed ${
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
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 max-w-[70%] text-xs text-slate-500 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                <span>Searching verified hospital knowledge...</span>
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
                  ? 'अपना प्रश्न यहाँ लिखें...'
                  : language === 'te'
                  ? 'మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...'
                  : 'Ask about tokens, wait times, rooms...'
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
