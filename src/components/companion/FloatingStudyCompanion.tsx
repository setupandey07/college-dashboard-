import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Minus,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  GraduationCap,
  Lightbulb,
  Calculator,
  Compass,
  FileText,
  Calendar,
  HelpCircle,
  ChevronDown,
  ShieldAlert,
  Users,
  Building2,
  TrendingUp,
  MessageSquareWarning,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicData } from '../../context/AcademicDataContext';
import { resolveUserScope } from '../../services/ai/academicScope';
import { queryAcademicIntelligence } from '../../services/ai/aiIntelligenceService';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  intent?: string;
  suggestedFollowUps?: string[];
}

interface QuickActionConfig {
  label: string;
  query: string;
  icon: any;
  color: string;
}

export const FloatingStudyCompanion: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const {
    departments,
    sections,
    subjects,
    attendanceSessions,
    studentAttendance,
    studentMarks,
    queries,
    users,
    timetables
  } = useAcademicData();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Authoritative Scoped Context Layer (Strict isolation per role)
  const scopedContext = useMemo(() => {
    return resolveUserScope(currentUser, currentRole, {
      departments,
      sections,
      subjects,
      attendanceSessions,
      studentAttendance,
      studentMarks,
      queries,
      users,
      timetables
    });
  }, [
    currentUser,
    currentRole,
    departments,
    sections,
    subjects,
    attendanceSessions,
    studentAttendance,
    studentMarks,
    queries,
    users,
    timetables
  ]);

  // Role-Specific Quick Actions
  const quickActions: QuickActionConfig[] = useMemo(() => {
    if (currentRole === 'student') {
      return [
        { label: 'My Attendance', query: 'What is my current attendance and how many classes do I need for 75%?', icon: Calendar, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { label: 'My Marks', query: 'How are my marks and which subjects need attention?', icon: FileText, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { label: 'Missed Syllabus', query: 'What syllabus topics did I miss during my absent classes?', icon: Compass, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { label: 'Study Plan', query: 'Create a focused 7-day study recovery plan for my subjects.', icon: Lightbulb, color: 'text-purple-700 bg-purple-50 border-purple-200' },
        { label: 'Exam Prep', query: 'How should I prepare for upcoming semester exams?', icon: Calculator, color: 'text-teal-700 bg-teal-50 border-teal-200' },
        { label: 'What Should I Focus On?', query: 'Which subjects need my immediate attention?', icon: HelpCircle, color: 'text-rose-700 bg-rose-50 border-rose-200' }
      ];
    }

    if (currentRole === 'faculty') {
      return [
        { label: 'Student Risk', query: 'Which assigned students are academically at risk or have attendance shortages?', icon: ShieldAlert, color: 'text-rose-700 bg-rose-50 border-rose-200' },
        { label: 'Attendance Issues', query: 'Show students below the 75% attendance threshold in my classes.', icon: Calendar, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { label: 'Class Performance', query: 'How is my assigned class performing across recent assessments?', icon: Activity, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { label: 'My Mentees', query: 'Give me a summary of my mentees and any pending concerns.', icon: Users, color: 'text-purple-700 bg-purple-50 border-purple-200' },
        { label: 'Syllabus Coverage', query: 'What is the syllabus completion and pacing for my assigned subjects?', icon: FileText, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      ];
    }

    if (currentRole === 'hod') {
      const dCode = scopedContext.hod?.departmentCode || 'Department';
      return [
        { label: 'Department Summary', query: `Give me a complete health summary for ${dCode}.`, icon: Building2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { label: 'Students At Risk', query: 'Which department students show both attendance and academic decline?', icon: ShieldAlert, color: 'text-rose-700 bg-rose-50 border-rose-200' },
        { label: 'Attendance Risk', query: 'Which academic year has the highest attendance shortage in our department?', icon: Calendar, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { label: 'Academic Risk', query: 'Which departmental subjects show weak assessment averages?', icon: TrendingUp, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { label: 'Mentor Insights', query: 'What are the mentor program insights and student engagement levels?', icon: Users, color: 'text-purple-700 bg-purple-50 border-purple-200' },
        { label: 'Queries & Grievances', query: 'What are the major student queries and pending grievances?', icon: MessageSquareWarning, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' }
      ];
    }

    // Admin
    return [
      { label: 'Institution Summary', query: 'Generate an overall institutional academic summary.', icon: Building2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { label: 'Department Comparison', query: 'Compare academic and attendance trends across all departments.', icon: TrendingUp, color: 'text-blue-700 bg-blue-50 border-blue-200' },
      { label: 'Attendance Trends', query: 'What is the overall student attendance trend across the college?', icon: Calendar, color: 'text-amber-700 bg-amber-50 border-amber-200' },
      { label: 'Academic Trends', query: 'Show academic performance trends and assessment averages.', icon: Activity, color: 'text-purple-700 bg-purple-50 border-purple-200' },
      { label: 'Mentor Program', query: 'What is the status of the institutional mentorship program?', icon: Users, color: 'text-teal-700 bg-teal-50 border-teal-200' },
      { label: 'Student Concerns', query: 'What are the major student query themes and unresolved grievances?', icon: MessageSquareWarning, color: 'text-rose-700 bg-rose-50 border-rose-200' }
    ];
  }, [currentRole, scopedContext]);

  // Initial welcome message per role
  useEffect(() => {
    let welcomeText = '';
    const name = currentUser.name || 'User';

    if (currentRole === 'student') {
      welcomeText = `Hey ${name}! 👋 I'm your **AcademicCore AI Study Companion**.

I am connected to your live university attendance, marks, classroom timetable, and syllabus records.

Ask me anything about your academic journey:
- *"What is my attendance status and how many classes do I need for 75%?"*
- *"What syllabus did I miss during my absent classes?"*
- *"How are my assessment marks and what should I focus on?"*
- *"Make me a 7-day study recovery plan."*`;
    } else if (currentRole === 'faculty') {
      welcomeText = `Hello Prof. ${name}! 🎓 I am your **Faculty Academic & Mentorship Assistant**.

I provide real-time insights for your assigned classrooms, subjects, and mentees:
- *"Which students are at academic risk or below 75% attendance?"*
- *"How is my assigned class performing?"*
- *"Give me a summary of my mentees."*`;
    } else if (currentRole === 'hod') {
      const dCode = scopedContext.hod?.departmentCode || 'your department';
      welcomeText = `Welcome HOD ${name}! 🏛️ I am your **Department Academic Intelligence System** for **${dCode}**.

Strictly scoped to your departmental data:
- *"Give me a department health summary."*
- *"Which year or section has attendance issues?"*
- *"What are the major open student queries and grievances?"*`;
    } else {
      welcomeText = `Welcome Administrator! 🌐 I am your **Institutional Academic Intelligence Platform**.

Providing institution-wide aggregate analytics across departments, students, faculty, and NAAC/NBA metrics.`;
    }

    setMessages([
      {
        id: 'initial-welcome',
        sender: 'ai',
        text: welcomeText,
        timestamp: Date.now(),
        suggestedFollowUps: quickActions.slice(0, 4).map(q => q.label)
      }
    ]);
  }, [currentRole, currentUser.name, scopedContext.hod?.departmentCode]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('#floating-ai-trigger')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isLoading) return;

    setInput('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await queryAcademicIntelligence(textToSend, scopedContext, messages);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.text,
        timestamp: Date.now(),
        intent: response.intent,
        suggestedFollowUps: response.suggestedFollowUps
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: `Encountered a momentary processing hiccup. Please ask your question again or select one of the quick actions below.`,
          timestamp: Date.now(),
          suggestedFollowUps: quickActions.slice(0, 3).map(q => q.label)
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (action: QuickActionConfig) => {
    handleSendMessage(action.query);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Session refreshed! ✨ Live database connection active.\n\nWhat would you like to analyze next?`,
        timestamp: Date.now(),
        suggestedFollowUps: quickActions.slice(0, 4).map(q => q.label)
      }
    ]);
  };

  // Listen to global open event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('open-study-companion', handleOpen);
    return () => window.removeEventListener('open-study-companion', handleOpen);
  }, []);

  const headerTitle = useMemo(() => {
    if (currentRole === 'student') return 'AI Study Companion';
    if (currentRole === 'faculty') return 'Faculty AI Assistant';
    if (currentRole === 'hod') return `HOD Intelligence (${scopedContext.hod?.departmentCode || 'DEPT'})`;
    return 'Institutional AI Intelligence';
  }, [currentRole, scopedContext.hod?.departmentCode]);

  const headerSubtitle = useMemo(() => {
    if (currentRole === 'student') return 'Your engineering study partner';
    if (currentRole === 'faculty') return 'Teaching & mentorship analytics';
    if (currentRole === 'hod') return 'Departmental health & operations';
    return 'Campus-wide academic intelligence';
  }, [currentRole]);

  return (
    <>
      {/* 1. CHAT PANEL */}
      {isOpen && (
        <div
          ref={panelRef}
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-white border border-[#CDE5D7] rounded-2xl shadow-2xl overflow-hidden ${
            isMinimized
              ? 'bottom-20 right-6 w-80 h-14'
              : 'bottom-22 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[450px] md:w-[480px] h-[640px] max-h-[82vh]'
          }`}
          style={{
            boxShadow: '0 20px 40px -15px rgba(20, 56, 44, 0.25), 0 0 0 1px rgba(27, 139, 103, 0.12)'
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0E281C] via-[#14382C] to-[#1B4D3C] text-white flex items-center justify-between shrink-0 border-b border-emerald-800/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shrink-0 shadow-xs flex items-center justify-center">
                <CuteRobotAvatar size={24} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#14382C] animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-tight text-white truncate">
                    {headerTitle}
                  </h3>
                  <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-400/20 shrink-0 uppercase">
                    {currentRole}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-200/80 truncate">
                  {headerSubtitle}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {!isMinimized && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/50 transition-colors cursor-pointer"
                  title="Clear chat session"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/50 transition-colors cursor-pointer"
                title={isMinimized ? 'Expand panel' : 'Minimize panel'}
              >
                {isMinimized ? <Sparkles className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/50 transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body (when not minimized) */}
          {!isMinimized && (
            <>
              {/* Role Quick Action Chips */}
              <div className="px-3 py-2 bg-[#F4F9F6] border-b border-[#E2EFE7] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
                {quickActions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium border whitespace-nowrap transition-all hover:scale-102 active:scale-98 cursor-pointer shrink-0 shadow-2xs ${action.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-[#FAFDFB]">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`flex gap-2 max-w-[94%] sm:max-w-[88%] ${
                        m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="shrink-0 mt-0.5">
                        {m.sender === 'ai' ? (
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-[#14382C] text-emerald-300 flex items-center justify-center text-[10px] font-bold shadow-xs">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Content Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          m.sender === 'user'
                            ? 'bg-[#14382C] text-white rounded-tr-xs'
                            : 'bg-white border border-[#DCEBE2] text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {m.sender === 'ai' ? (
                          <MarkdownRenderer content={m.text} />
                        ) : (
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        )}
                      </div>
                    </div>

                    {/* Interactive Follow-Up Chips */}
                    {m.sender === 'ai' && m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                      <div className="mt-2 pl-8 flex flex-wrap gap-1.5">
                        {m.suggestedFollowUps.map((prompt, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => handleSendMessage(prompt.replace(/[^\w\s\?\-\+\/\*\:\,]/gi, '').trim())}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-[#EBF5EF] hover:bg-[#DEEFE5] text-[#14382C] font-semibold border border-[#CDE5D7] transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-2xs"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading state */}
                {isLoading && (
                  <div className="flex gap-2 items-center pl-8 text-xs text-emerald-800">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin shrink-0" />
                    <span className="text-[11px] font-medium text-emerald-900/80">
                      Querying academic intelligence & calculating records...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Context Footer & Input */}
              <div className="p-3 bg-white border-t border-[#E2EFE7] shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex flex-col gap-1.5"
                >
                  <div className="relative flex items-center">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        currentRole === 'student'
                          ? "Ask attendance %, missed syllabus, marks, or concepts..."
                          : currentRole === 'faculty'
                          ? "Ask about students at risk, mentee summary, or class pacing..."
                          : currentRole === 'hod'
                          ? "Ask department summary, risk distribution, or grievances..."
                          : "Ask institutional summary or department comparisons..."
                      }
                      className="w-full text-xs py-2 pl-3 pr-10 bg-[#F4F9F6] border border-[#CDE5D7] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B8B67] focus:border-[#1B8B67] text-[#14382C] placeholder-[#739486] transition-all resize-none max-h-24 leading-relaxed"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-1.5 p-1.5 rounded-lg bg-[#1B8B67] hover:bg-[#167557] disabled:opacity-40 disabled:hover:bg-[#1B8B67] text-white transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Send query (Enter)"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-1 text-[9.5px] text-[#6B8B7D]">
                    <span className="flex items-center gap-1 truncate">
                      <GraduationCap className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {currentUser.department || currentUser.departmentCode || 'Institutional'}
                      </span>
                      <span>•</span>
                      <span className="uppercase font-semibold">{currentRole}</span>
                    </span>
                    <span className="shrink-0 hidden sm:inline">Enter to send • Shift+Enter for newline</span>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. FLOATING TRIGGER BUTTON (Avatar at bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {!isOpen && isHovered && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#14382C] text-white text-[11px] font-medium rounded-xl shadow-lg border border-emerald-700/50 animate-in fade-in slide-in-from-right-2 duration-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AcademicCore AI • {headerTitle}</span>
          </div>
        )}

        <button
          id="floating-ai-trigger"
          onClick={() => {
            if (isOpen && isMinimized) {
              setIsMinimized(false);
            } else {
              setIsOpen(!isOpen);
              setIsMinimized(false);
            }
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`relative group flex items-center justify-center w-13 h-13 rounded-2xl cursor-pointer transition-all duration-300 transform active:scale-95 shadow-xl ${
            isOpen
              ? 'bg-[#14382C] text-white rotate-0 ring-4 ring-emerald-500/20'
              : 'bg-gradient-to-tr from-[#0F766E] via-[#1B8B67] to-[#10B981] text-white hover:scale-108 hover:shadow-2xl hover:shadow-emerald-600/30'
          }`}
          style={{
            boxShadow: '0 8px 24px -4px rgba(27, 139, 103, 0.45)'
          }}
          title={headerTitle}
        >
          {!isOpen && (
            <span className="absolute -inset-1 rounded-2xl bg-emerald-400/20 animate-ping pointer-events-none opacity-40" />
          )}

          {isOpen ? (
            <ChevronDown className="w-6 h-6 text-emerald-300 transition-transform" />
          ) : (
            <CuteRobotAvatar size={34} />
          )}

          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-300 border-2 border-[#14382C] shadow-xs" />
        </button>
      </div>
    </>
  );
};

function CuteRobotAvatar({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
    >
      <line x1="24" y1="10" x2="24" y2="4" stroke="#A7F3D0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="4" r="3" fill="#FCD34D" />
      <circle cx="24" cy="4" r="1.5" fill="#FFF" />

      <rect
        x="8"
        y="10"
        width="32"
        height="26"
        rx="10"
        fill="url(#bot-grad)"
        stroke="#FFFFFF"
        strokeWidth="1.8"
      />

      <rect
        x="13"
        y="16"
        width="22"
        height="13"
        rx="6"
        fill="#0B2319"
      />

      <ellipse cx="19" cy="22" rx="2.5" ry="3" fill="#34D399" />
      <circle cx="19.8" cy="21.2" r="1" fill="#FFFFFF" />

      <ellipse cx="29" cy="22" rx="2.5" ry="3" fill="#34D399" />
      <circle cx="29.8" cy="21.2" r="1" fill="#FFFFFF" />

      <path
        d="M21 25.5C22.2 26.8 25.8 26.8 27 25.5"
        stroke="#6EE7B7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <rect x="5.5" y="19" width="3" height="7" rx="1.5" fill="#6EE7B7" />
      <rect x="39.5" y="19" width="3" height="7" rx="1.5" fill="#6EE7B7" />

      <path
        d="M17 10L24 7L31 10"
        stroke="#FCD34D"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <defs>
        <linearGradient id="bot-grad" x1="8" y1="10" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1B8B67" />
          <stop offset="1" stopColor="#0D9488" />
        </linearGradient>
      </defs>
    </svg>
  );
}
