import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { askAcademicCopilot } from '../../services/geminiService';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({ isOpen, onClose }) => {
  const { currentRole, currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `Hello ${currentUser.name}! I am your AcademicCore Institutional AI Copilot. I can assist with syllabus pacing guidelines, Bloom's taxonomy assessments, attendance shortage notifications, student inquiry drafts, or NAAC/NBA accreditation preparation. How may I assist you?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const response = await askAcademicCopilot(userText, currentRole);
      setMessages(prev => [...prev, { sender: 'ai', text: response }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Encountered a momentary connection issue. Please verify your query or try again shortly.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'How many classes are required to recover 71% attendance to 75%?',
    'Draft a reply to student grievance on internal marks re-evaluation',
    'Summarize NAAC Criterion 2 teaching-learning requirements',
    'Generate Bloom taxonomy questions for Database Normalization'
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full h-[600px] shadow-xl border border-[#E2E8F0] flex flex-col overflow-hidden animate-in fade-in duration-100">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-indigo-600/50 flex items-center justify-center border border-indigo-400/40">
              <Sparkles className="w-3.5 h-3.5 text-[#818CF8]" />
            </div>
            <div>
              <h2 className="text-xs font-bold flex items-center gap-2">
                AcademicCore Institutional AI Copilot
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-400/30">
                  Gemini 2.5
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">
                Persona: {currentUser.name} ({currentRole.replace('_', ' ').toUpperCase()})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC] text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-6 h-6 rounded bg-[#0F172A] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Bot className="w-3.5 h-3.5 text-[#818CF8]" />
                </div>
              )}
              <div
                className={`p-3 rounded-lg max-w-[85%] leading-relaxed whitespace-pre-line text-xs ${
                  m.sender === 'user'
                    ? 'bg-[#0F172A] text-white rounded-br-none shadow-2xs'
                    : 'bg-white text-slate-800 rounded-bl-none border border-[#E2E8F0] shadow-2xs'
                }`}
              >
                {m.text}
              </div>
              {m.sender === 'user' && (
                <div className="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 items-center text-slate-500 text-xs pl-8">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46E5]" />
              <span>Consulting academic knowledge repository...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3.5 py-1.5 bg-white border-t border-[#E2E8F0] flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold uppercase text-[9px] shrink-0">Prompts:</span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setInput(p)}
              className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 whitespace-nowrap transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-[#E2E8F0] bg-white flex gap-2">
          <input
            type="text"
            placeholder="Ask AcademicCore Copilot about syllabus, attendance, regulations, audits..."
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3.5 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Query
          </button>
        </form>
      </div>
    </div>
  );
};
