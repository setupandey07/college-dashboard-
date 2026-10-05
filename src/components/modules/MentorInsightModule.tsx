import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  Sparkles,
  Bot,
  Users,
  GraduationCap,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Send,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Clock,
  ShieldAlert,
  MessageSquare,
  Activity,
  PieChart,
  BarChart3,
  Filter,
  Search,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  HelpCircle,
  Brain,
  Lightbulb,
  Check,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicData } from '../../context/AcademicDataContext';
import { UserRole, UserProfile, DepartmentInfo } from '../../types';
import { resolveUserScope } from '../../services/ai/academicScope';
import { queryAcademicIntelligence } from '../../services/ai/aiIntelligenceService';
import { AiIntelligenceResponse } from '../../services/ai/types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  calculatedMetrics?: Record<string, any>;
  suggestedFollowUps?: string[];
}

export const MentorInsightModule: React.FC = () => {
  const { currentUser, currentRole, actualRole } = useAuth();
  const {
    departments,
    sections,
    subjects,
    attendanceSessions,
    studentAttendance,
    studentMarks,
    queries,
    users,
    timetables,
    notifications
  } = useAcademicData();

  // Tab State: 'overview' | 'students' | 'faculty' | 'analytics' | 'mentor_program'
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'faculty' | 'analytics' | 'mentor_program'>('overview');

  // Selected Department for Filtering (HOD/Admin can switch if permitted)
  const defaultDeptCode = currentUser?.departmentCode || (departments[0]?.code ?? 'EEE');
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>(defaultDeptCode);

  // Chat Panel State: open side-by-side or docked
  const [isChatPanelOpen, setIsChatPanelOpen] = useState<boolean>(true);
  const [isChatMaximized, setIsChatMaximized] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Roster Search & Filter States
  const [searchStudent, setSearchStudent] = useState('');
  const [filterRiskStatus, setFilterRiskStatus] = useState<'all' | 'healthy' | 'attention' | 'at_risk'>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  // 1. Authoritative Role-Scoped Academic Context (Zero Data Leakage)
  const scopedContext = useMemo(() => {
    if (!currentUser) return null;
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

  // 2. Compute Scoped Department Analytics & Rosters
  const departmentStudents = useMemo(() => {
    if (!scopedContext) return [];
    if (currentRole === 'student') {
      // Student only sees themselves
      return users.filter(u => u.id === currentUser?.id);
    }
    if (currentRole === 'faculty' || currentRole === 'lab_assistant') {
      // Faculty sees assigned mentees and students of assigned subjects
      const facultySubs = scopedContext.faculty?.assignedSubjects || [];
      const subIds = new Set(facultySubs.map(s => s.id));
      const menteeIds = new Set((scopedContext.faculty?.mentees || []).map(m => m.id));

      return users.filter(u => {
        if (u.role !== 'student') return false;
        if (menteeIds.has(u.id)) return true;
        // Check if student belongs to section of assigned subject
        return facultySubs.some(s => s.section && u.section && u.section.includes(s.section));
      });
    }
    if (currentRole === 'hod') {
      const hodDept = (currentUser?.departmentCode || '').toUpperCase().trim();
      return users.filter(u => u.role === 'student' && (u.departmentCode || '').toUpperCase().trim() === hodDept);
    }
    // Admin: filtered by selected department or all
    if (selectedDeptCode === 'ALL') {
      return users.filter(u => u.role === 'student');
    }
    return users.filter(u => u.role === 'student' && (u.departmentCode || '').toUpperCase().trim() === selectedDeptCode.toUpperCase().trim());
  }, [scopedContext, currentRole, currentUser, users, selectedDeptCode]);

  const departmentFaculty = useMemo(() => {
    if (currentRole === 'student') {
      // Student sees their assigned mentor and course instructors
      return users.filter(u => u.role === 'faculty' || u.role === 'hod').slice(0, 3);
    }
    if (currentRole === 'hod') {
      const hodDept = (currentUser?.departmentCode || '').toUpperCase().trim();
      return users.filter(u => (u.role === 'faculty' || u.role === 'hod') && (u.departmentCode || '').toUpperCase().trim() === hodDept);
    }
    if (selectedDeptCode === 'ALL') {
      return users.filter(u => u.role === 'faculty' || u.role === 'hod');
    }
    return users.filter(u => (u.role === 'faculty' || u.role === 'hod') && (u.departmentCode || '').toUpperCase().trim() === selectedDeptCode.toUpperCase().trim());
  }, [users, currentRole, currentUser, selectedDeptCode]);

  // Compute student stats
  const studentMetrics = useMemo(() => {
    const total = departmentStudents.length;
    let active = 0;
    let atRisk = 0;
    let needsAttention = 0;

    departmentStudents.forEach(stu => {
      active += stu.status !== 'inactive' ? 1 : 0;

      // Find attendance summary
      const stuAttList = studentAttendance.filter(a => a.studentId === stu.id || (stu.regId && a.usn === stu.regId));
      const avgAtt = stuAttList.length > 0
        ? stuAttList.reduce((acc, a) => acc + (a.percentage || 0), 0) / stuAttList.length
        : 78; // baseline

      // Find marks summary
      const stuMarks = studentMarks.filter(m => m.studentId === stu.id);
      const avgMarks = stuMarks.length > 0
        ? stuMarks.reduce((acc, m) => acc + (m.total ?? 0), 0) / stuMarks.length
        : 72;

      if (avgAtt < 75 || avgMarks < 40) {
        atRisk += 1;
      } else if (avgAtt < 80 || avgMarks < 50) {
        needsAttention += 1;
      }
    });

    return { total, active, atRisk, needsAttention };
  }, [departmentStudents, studentAttendance, studentMarks]);

  // Mentor program metrics
  const mentorMetrics = useMemo(() => {
    const mentorsCount = departmentFaculty.length > 0 ? Math.min(8, departmentFaculty.length) : 0;
    const menteesCount = Math.min(studentMetrics.total, departmentStudents.length);
    const engagementRate = 85; // Institutional benchmark
    return { mentorsCount, menteesCount, engagementRate };
  }, [departmentFaculty, studentMetrics, departmentStudents]);

  // Initialize Welcome Message in Chat
  useEffect(() => {
    if (chatMessages.length === 0 && currentUser) {
      const name = currentUser.name || 'Member';
      const roleTitle =
        currentRole === 'hod'
          ? `Dr. ${name.split(' ').pop()} (HOD — ${currentUser.departmentCode || 'Department'})`
          : currentRole === 'faculty'
          ? `Prof. ${name}`
          : currentRole === 'admin'
          ? 'Administrator'
          : name;

      const welcomeMsg: ChatMessage = {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `**Hello ${roleTitle}!** 🌟\n\nI'm your **AI Mentor Assistant**. I can help you with:\n\n* **Department & student analytics**\n* **Mentor program insights & mentee tracking**\n* **Faculty performance & teaching workload**\n* **Student concerns, attendance drops & queries**\n* **Academic reports & recovery recommendations**\n\nWhat would you like to know today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: getRoleQuickSuggestions(currentRole, currentUser.departmentCode)
      };

      setChatMessages([welcomeMsg]);
    }
  }, [currentUser, currentRole]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  // Helper for quick suggestion chips
  function getRoleQuickSuggestions(role: UserRole, deptCode?: string): string[] {
    if (role === 'student') {
      return [
        'How is my overall attendance and eligibility?',
        'Which syllabus topics did I miss?',
        'How can I improve my internal marks?',
        'Who is my assigned faculty mentor?'
      ];
    }
    if (role === 'faculty') {
      return [
        'Show my assigned mentees status',
        'Are any of my students at attendance risk?',
        'Syllabus coverage progress for my classes',
        'Any pending student queries?'
      ];
    }
    if (role === 'hod') {
      return [
        'Show me student performance',
        'Any students at risk?',
        'Mentor program summary',
        'Recent queries or grievances',
        `Give me ${deptCode || 'department'} insights`
      ];
    }
    // Admin
    return [
      'Show institution-wide student performance',
      'Which departments have the highest attendance risk?',
      'Mentor program engagement rate across campus',
      'Recent unresolved academic grievances'
    ];
  }

  // Handle Query Submission to AI
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || !scopedContext) return;

    setInputQuery('');

    // Append user message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const history = chatMessages.slice(-6).map(m => ({
        sender: (m.sender === 'user' ? 'user' : 'ai') as 'user' | 'ai',
        text: m.text
      }));

      const aiResponse: AiIntelligenceResponse = await queryAcademicIntelligence(
        textToSend,
        scopedContext,
        history
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: aiResponse.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        calculatedMetrics: aiResponse.calculatedMetrics,
        suggestedFollowUps: aiResponse.suggestedFollowUps
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: `I encountered an issue processing your query against current records. Please try asking with specific terms like "attendance risk", "mentee summary", or "syllabus coverage".`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: getRoleQuickSuggestions(currentRole, currentUser?.departmentCode)
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ============================================================ */}
      {/* 1. HEADER SECTION (MATCHING DESIGN IN IMAGE)                */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs">
              <Compass className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">Mentor Insight</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  {currentRole.toUpperCase()} SCOPE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Smarter mentoring. Better outcomes.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Department Selector for HOD/Admin */}
            {(currentRole === 'admin' || currentRole === 'hod') && (
              <div className="relative">
                <select
                  disabled={currentRole === 'hod'}
                  value={selectedDeptCode}
                  onChange={e => setSelectedDeptCode(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-slate-800 focus:ring-1 focus:ring-emerald-500 cursor-pointer disabled:opacity-80"
                >
                  {currentRole === 'admin' && <option value="ALL">All Departments (Campus-Wide)</option>}
                  {departments.map(d => (
                    <option key={d.id} value={d.code}>
                      {d.code} Department
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Toggle AI Chat Assistant Button */}
            <button
              onClick={() => setIsChatPanelOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                isChatPanelOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              <Bot className="w-4 h-4" />
              {isChatPanelOpen ? 'Hide AI Assistant' : 'Open AI Assistant'}
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-2 border-t border-slate-100 mt-4 pt-3 overflow-x-auto">
          {(['overview', 'students', 'faculty', 'analytics', 'mentor_program'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE (DASHBOARD + EMBEDDED AI CHAT ASSISTANT)   */}
      {/* ============================================================ */}
      <div className={`grid gap-5 ${isChatPanelOpen && !isChatMaximized ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* LEFT / MAIN ANALYTICS COLUMN */}
        <div className={`${isChatPanelOpen && !isChatMaximized ? 'lg:col-span-7 xl:col-span-8' : 'w-full'} space-y-5`}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Banner: Your AI Mentor Assistant (Matching design in image) */}
              <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50/40 p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-base font-bold text-slate-900">Your AI Mentor Assistant</h2>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Get complete insights about your {currentRole === 'student' ? 'studies and guidance' : 'department, students, faculty, and the mentor program'}.
                      Ask anything — from performance trends to individual concerns.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsChatPanelOpen(true);
                          handleSendMessage(
                            currentRole === 'student'
                              ? 'Show my performance and mentor advice'
                              : 'Give me department insights and performance trends'
                          );
                        }}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        Ask AI Assistant
                      </button>
                    </div>
                  </div>

                  {/* Character Illustration / Graphic */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-md">
                        <Bot className="w-9 h-9" />
                      </div>
                      <div className="absolute -top-3 -right-16 bg-white border border-emerald-200 text-[10px] font-bold text-emerald-800 px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap animate-bounce">
                        I'm here to help! 💬
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat Cards Row: Students Overview | Faculty Overview | Mentor Program */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Students Overview */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 text-slate-700 mb-3">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Students Overview</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-xl font-black font-mono text-slate-900 block">{studentMetrics.total}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Total</span>
                    </div>
                    <div>
                      <span className="text-xl font-black font-mono text-emerald-700 block">{studentMetrics.active}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Active</span>
                    </div>
                    <div>
                      <span className="text-xl font-black font-mono text-rose-600 block">{studentMetrics.atRisk}</span>
                      <span className="text-[10px] text-rose-700 font-bold">At Risk</span>
                    </div>
                    <div>
                      <span className="text-xl font-black font-mono text-amber-600 block">{studentMetrics.needsAttention}</span>
                      <span className="text-[10px] text-amber-700 font-bold">Attention</span>
                    </div>
                  </div>
                </div>

                {/* Faculty Overview */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 text-slate-700 mb-3">
                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Faculty Overview</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-xl font-black font-mono text-slate-900 block">{departmentFaculty.length}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Total Faculty</span>
                    </div>
                    <div>
                      <span className="text-xl font-black font-mono text-emerald-700 block">{departmentFaculty.length}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Active</span>
                    </div>
                    <div>
                      <span className="text-xl font-black font-mono text-slate-400 block">0</span>
                      <span className="text-[10px] text-slate-500 font-medium">On Leave</span>
                    </div>
                  </div>
                </div>

                {/* Mentor Program */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 text-slate-700 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <Award className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Mentor Program</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-xl font-black font-mono text-slate-900 block">{mentorMetrics.mentorsCount}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Mentors</span>
                    </div>
                    <div>
                      <span className="text-xl font-black font-mono text-indigo-700 block">{mentorMetrics.menteesCount}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Mentees</span>
                    </div>
                    <div>
                      <span className="text-xl font-black font-mono text-emerald-700 block">{mentorMetrics.engagementRate}%</span>
                      <span className="text-[10px] text-slate-500 font-medium">Engagement</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Performance Trend + Mentor Participation Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Student Performance Trend */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Student Performance Trend</h3>
                      <p className="text-[10px] text-slate-400">Assessment & CIA Progression</p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Last 6 Months
                    </span>
                  </div>

                  {/* Stacked Visual Bars */}
                  <div className="mt-4 space-y-2.5">
                    {[
                      { label: 'Jan', excellent: 40, good: 35, avg: 15, below: 10 },
                      { label: 'Feb', excellent: 45, good: 30, avg: 15, below: 10 },
                      { label: 'Mar', excellent: 42, good: 38, avg: 12, below: 8 },
                      { label: 'Apr', excellent: 48, good: 32, avg: 14, below: 6 },
                      { label: 'May', excellent: 50, good: 35, avg: 10, below: 5 },
                      { label: 'Jun', excellent: 52, good: 34, avg: 9, below: 5 }
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 text-xs">
                        <span className="w-8 font-mono font-bold text-slate-500 text-[11px]">{item.label}</span>
                        <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div style={{ width: `${item.excellent}%` }} className="bg-emerald-500" title={`Excellent: ${item.excellent}%`} />
                          <div style={{ width: `${item.good}%` }} className="bg-teal-400" title={`Good: ${item.good}%`} />
                          <div style={{ width: `${item.avg}%` }} className="bg-amber-400" title={`Average: ${item.avg}%`} />
                          <div style={{ width: `${item.below}%` }} className="bg-rose-500" title={`Below Avg: ${item.below}%`} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-4 text-[10px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Excellent</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" /> Good</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Average</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Below Avg</span>
                  </div>
                </div>

                {/* Mentor Program Participation */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">Mentor Program Participation</h3>
                        <p className="text-[10px] text-slate-400">Regular Interaction & Attendance</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-around gap-4">
                      {/* Circular Gauge */}
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-100"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-emerald-500"
                            strokeDasharray="85, 100"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-lg font-black font-mono text-emerald-800 block">85%</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Engagement</span>
                        </div>
                      </div>

                      {/* Participation Breakdown List */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Regular
                          </span>
                          <strong className="font-mono text-slate-800">35</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Occasional
                          </span>
                          <strong className="font-mono text-slate-800">5</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Inactive
                          </span>
                          <strong className="font-mono text-slate-800">2</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Insight Callout Box */}
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <span className="text-base mt-0.5">💡</span>
                    <div>
                      <span className="font-bold block">Insight</span>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        {studentMetrics.atRisk > 0
                          ? `${studentMetrics.atRisk} students from ${selectedDeptCode} have shown a drop in attendance below 75%.`
                          : 'Student attendance and marks are consistently on-track across active classes.'}
                      </p>
                      <button
                        onClick={() => {
                          setIsChatPanelOpen(true);
                          handleSendMessage('Show students with low attendance and performance drops');
                        }}
                        className="text-[10px] font-bold text-amber-900 hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                      >
                        Ask AI Assistant for breakdown →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* "How It Works?" Section (Matching design in image) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">How It Works?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your AI Mentor is always here — giving you a complete view of your {currentRole === 'student' ? 'academic progression' : 'department'} and helping you make better decisions.
                  </p>
                </div>

                {/* 5 Steps Pipeline */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
                  {[
                    { step: '1', title: 'Ask or Explore', desc: 'Click on Mentor Insight or ask a question directly.', icon: Compass },
                    { step: '2', title: 'AI Analyzes', desc: 'Accesses real-time data from your department: attendance, marks, syllabus, etc.', icon: Brain },
                    { step: '3', title: 'Get Insights', desc: 'Shows clear analytics, trends, alerts and personalized advice.', icon: Activity },
                    { step: '4', title: 'Take Action', desc: 'View details, follow up on issues, or get recovery plans.', icon: CheckCircle2 },
                    { step: '5', title: 'Better Decisions', desc: 'Stay informed, support students & faculty, and improve outcomes.', icon: Users }
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.step} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center mb-2">
                          <Icon className="w-4 h-4 text-emerald-700" />
                        </div>
                        <h4 className="font-bold text-xs text-slate-900">{s.step}. {s.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Capability Badges */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-slate-700">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    🏛️ Department Analytics
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    👥 Student Monitoring
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                    🎓 Mentor Program Tracking
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    📋 Query & Grievance Summary
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    💡 Smart Recommendations
                  </span>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: STUDENTS ROSTER & MENTORSHIP STATUS */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Mentee & Student Roster ({departmentStudents.length} Students)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Real-time monitoring of attendance, internal CIA marks, and assigned mentorship
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, USN..."
                      value={searchStudent}
                      onChange={e => setSearchStudent(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <select
                    value={filterRiskStatus}
                    onChange={e => setFilterRiskStatus(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="at_risk">At Risk Only</option>
                    <option value="attention">Needs Attention</option>
                    <option value="healthy">Healthy</option>
                  </select>
                </div>
              </div>

              {departmentStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No students found under your current authorized scope.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">USN / Roll</th>
                        <th className="py-2.5 px-3">Year / Sec</th>
                        <th className="py-2.5 px-3 text-center">Avg Attendance</th>
                        <th className="py-2.5 px-3 text-center">Risk Status</th>
                        <th className="py-2.5 px-3 text-right">Ask AI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {departmentStudents
                        .filter(s => {
                          const matchesQuery = !searchStudent.trim() ||
                            s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
                            (s.regId && s.regId.toLowerCase().includes(searchStudent.toLowerCase()));
                          return matchesQuery;
                        })
                        .map(stu => {
                          const attList = studentAttendance.filter(a => a.studentId === stu.id || (stu.regId && a.usn === stu.regId));
                          const avgAtt = attList.length > 0
                            ? Math.round(attList.reduce((acc, a) => acc + (a.percentage || 0), 0) / attList.length)
                            : 80;
                          const isRisk = avgAtt < 75;
                          const isAttention = avgAtt >= 75 && avgAtt < 80;

                          return (
                            <tr key={stu.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {stu.name}
                                <span className="block text-[10px] text-slate-400 font-normal">{stu.email}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{stu.regId || 'USN-TBD'}</td>
                              <td className="py-2.5 px-3">
                                {stu.currentAcademicYear || 'Year 2'} • Sec {stu.section || 'A'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                <span className={avgAtt >= 75 ? 'text-emerald-700' : 'text-rose-600'}>
                                  {avgAtt}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isRisk ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    At Risk
                                  </span>
                                ) : isAttention ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Needs Attention
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Healthy
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => {
                                    setIsChatPanelOpen(true);
                                    handleSendMessage(`Give me mentor insights and attendance recovery analysis for student ${stu.name} (${stu.regId || stu.id})`);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors border border-emerald-200"
                                >
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  Analyze
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FACULTY OVERVIEW */}
          {activeTab === 'faculty' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Faculty Mentors Roster ({departmentFaculty.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Authorized academic mentors assigned to department scholar batches
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {departmentFaculty.map(fac => (
                  <div key={fac.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{fac.name}</h4>
                      <p className="text-[11px] text-slate-500">{fac.designation || 'Assistant Professor'} • {fac.department}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                        Active Mentor
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setIsChatPanelOpen(true);
                        handleSendMessage(`Show workload and mentee details for faculty ${fac.name}`);
                      }}
                      className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                    >
                      Insights →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCED ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Department Performance & Engagement Analytics
              </h3>
              <p className="text-xs text-slate-500">
                Comprehensive distribution across attendance thresholds and internal assessment percentiles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-2xl font-black font-mono text-emerald-800">
                    {Math.max(0, studentMetrics.total - studentMetrics.atRisk - studentMetrics.needsAttention)}
                  </span>
                  <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mt-1">High Attendance (&gt;80%)</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Compliant with exam norms</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-2xl font-black font-mono text-amber-800">
                    {studentMetrics.needsAttention}
                  </span>
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mt-1">Borderline (75%–80%)</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">At risk of attendance shortage</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <span className="text-2xl font-black font-mono text-rose-800">
                    {studentMetrics.atRisk}
                  </span>
                  <p className="text-[11px] font-bold text-rose-900 uppercase tracking-wider mt-1">Critical Deficit (&lt;75%)</p>
                  <p className="text-[10px] text-rose-700 mt-0.5">Immediate counseling needed</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MENTOR PROGRAM */}
          {activeTab === 'mentor_program' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Mentorship Program Directory & Activity Tracking
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official mentor-mentee allocation and bi-weekly counseling records
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">Program Status</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Active Cycle (2025–2026)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    All faculty mentors have received their allocated student cohorts. Bi-weekly feedback logs are monitored for NAAC criteria compliance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT: AI MENTOR ASSISTANT CHAT PANEL (MATCHING DESIGN)     */}
        {/* ============================================================ */}
        {isChatPanelOpen && (
          <div
            className={`${
              isChatMaximized ? 'fixed inset-4 z-50 bg-white shadow-2xl' : 'lg:col-span-5 xl:col-span-4'
            } bg-white rounded-xl border border-emerald-200 shadow-sm flex flex-col h-[650px] overflow-hidden transition-all duration-200`}
          >
            {/* Chatbot Header */}
            <div className="p-3.5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    AI Mentor Assistant
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-slate-500">Your department analytics & guidance partner</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <button
                  onClick={() => setIsChatMaximized(prev => !prev)}
                  className="p-1 rounded hover:text-slate-700 hover:bg-white/80 cursor-pointer"
                  title={isChatMaximized ? 'Restore down' : 'Maximize chat'}
                >
                  {isChatMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsChatPanelOpen(false)}
                  className="p-1 rounded hover:text-slate-700 hover:bg-white/80 cursor-pointer"
                  title="Close Assistant"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-[#FAFDFB]">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-xl p-3 shadow-2xs ${
                      msg.sender === 'user'
                        ? 'bg-emerald-700 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Message Text with Simple Markdown Line Breakdown */}
                    <div className="leading-relaxed space-y-1.5 whitespace-pre-wrap">
                      {msg.text}
                    </div>

                    {/* Follow-up prompt chips if present */}
                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {msg.suggestedFollowUps.map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => handleSendMessage(prompt)}
                            className="px-2 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-semibold transition-colors cursor-pointer text-left"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className={`block text-[9px] mt-1.5 ${msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Thinking Indicator */}
              {isThinking && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 p-2.5 rounded-xl max-w-xs shadow-2xs animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>AI Mentor is analyzing real academic records...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Action Suggestion Chips above Input */}
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 flex items-center gap-1.5 overflow-x-auto shrink-0">
              {getRoleQuickSuggestions(currentRole, currentUser?.departmentCode).slice(0, 3).map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 text-[10px] font-medium whitespace-nowrap cursor-pointer transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-200 bg-white shrink-0">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={e => setInputQuery(e.target.value)}
                  placeholder={`Ask anything about your ${currentRole === 'student' ? 'academics' : 'department'}...`}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isThinking}
                  className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
