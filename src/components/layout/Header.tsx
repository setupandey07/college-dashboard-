import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  ChevronDown,
  UserCheck,
  Search,
  CheckCircle2,
  Shield,
  GraduationCap,
  Building2,
  Check,
  LogOut,
  RotateCcw,
  Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicData } from '../../context/AcademicDataContext';
import { UserRole } from '../../types';

interface HeaderProps {
  currentTab: string;
  onOpenAiAssistant: () => void;
  onNavigateToProfile: () => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenAiAssistant,
  onNavigateToProfile,
  onOpenMobileMenu
}) => {
  const { currentUser, currentRole, setRole, returnToAdmin, logout, isDevRoleSwitcherActive, isSimulatingRole } = useAuth();
  const { announcements, queries } = useAcademicData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rolesList: { role: UserRole; title: string; subtitle: string; icon: string }[] = [
    { role: 'admin', title: 'Admin', subtitle: 'Academic Affairs & Governance', icon: '🏛️' },
    { role: 'hod', title: 'HOD', subtitle: 'Department Head Portal', icon: '🎓' },
    { role: 'faculty', title: 'Faculty', subtitle: 'Teaching & Course Evaluation', icon: '📚' },
    { role: 'lab_assistant', title: 'Lab Assistant', subtitle: 'Laboratory & Hardware In-Charge', icon: '🔬' },
    { role: 'student', title: 'Student', subtitle: 'Enrolled Undergraduate Student', icon: '🎒' }
  ];

  const currentRoleMeta = rolesList.find(r => r.role === currentRole) || rolesList[0];

  const pendingQueriesCount = queries.filter(q => q.status === 'open' || q.status === 'in_progress').length;
  const recentNotifications = announcements.slice(0, 4);

  const getInitials = (name: string) => {
    const parts = name.replace(/^Dr\.\s*|^Prof\.\s*|^Mr\.\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] + (name[1] || '')).toUpperCase();
  };

  const getBreadcrumb = () => {
    switch (currentRole) {
      case 'admin':
        return 'NIT Academic Governance / Office of the Dean';
      case 'hod':
        return 'Department of Computer Science & Engineering / HOD Portal';
      case 'faculty':
        return 'Faculty of Engineering / Department of Computer Science';
      case 'lab_assistant':
        return 'Central Computing Facility / Advanced Systems Lab';
      case 'student':
        return 'Undergraduate Academic Portal / B.Tech CSE (Sem 5)';
      default:
        return 'National Institute of Technology / AcademicCore';
    }
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Academic Administration Dashboard';
      case 'attendance':
        return 'Attendance Monitoring & Eligibility Registry';
      case 'marks':
        return 'Continuous Internal Assessment (CIA) & Marks';
      case 'syllabus':
        return 'Syllabus Adherence & Contact Hours Audit';
      case 'workload':
        return 'Faculty Workload & Credit Allocation Matrix';
      case 'departments':
        return 'Academic Departments & Program Directory';
      case 'users':
        return 'Institutional Identity & User Directory';
      case 'queries':
        return 'Grievance Redressal & Academic Queries';
      case 'innovation':
        return 'Innovation Cell, R&D & Incubation Hub';
      case 'reports':
        return 'Accreditation Dossiers & Statutory Audits';
      case 'announcements':
        return 'Official Circulars & Senate Notifications';
      case 'lab_ops':
        return 'Laboratory Operations & Equipment Health';
      case 'profile':
        return 'Official Academic Credential Profile';
      default:
        return 'Academic Management System';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0]">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Header with Institutional Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200"
            aria-label="Toggle Navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <span className="truncate hidden sm:inline">{getBreadcrumb()}</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="font-semibold text-slate-700 capitalize">{currentTab}</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight truncate leading-snug">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Center: Clean Institutional Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-xs xl:max-w-sm mx-4">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search roll no, course code, circular..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5] text-slate-800 placeholder-slate-400 transition-colors"
            />
          </div>
        </div>

        {/* Right: Institutional Status, Role Dropdown, Alerts & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Subtle Institutional Real-Time Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="font-medium text-[11px] text-slate-700">Live · AY 2026-27</span>
          </div>

          {/* Clean Institutional Role Selector Dropdown (Authorized Admin Only) */}
          {isDevRoleSwitcherActive && (
            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-md text-xs transition-colors ${
                  currentRole !== 'admin'
                    ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 text-amber-900 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 border-[#E2E8F0] text-slate-800'
                }`}
                title="Admin Role Switcher: Test and experience all role workflows"
              >
                {currentRole !== 'admin' ? (
                  <Eye className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-[#4F46E5]" />
                )}
                <div className="text-left hidden sm:block">
                  <span className={`text-[9px] uppercase font-bold block leading-none ${
                    currentRole !== 'admin' ? 'text-amber-700' : 'text-slate-400'
                  }`}>
                    {currentRole !== 'admin' ? 'Visiting Role' : 'Role'}
                  </span>
                  <span className="font-bold leading-tight">{currentRoleMeta.title}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white border border-[#E2E8F0] rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Admin Role Switcher
                      </p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Admin Access
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Visit any role to experience their portal and test workflows
                    </p>
                  </div>

                  {/* Return to Admin quick action button if currently in another role */}
                  {currentRole !== 'admin' && (
                    <div className="p-1.5 border-b border-slate-100 bg-amber-50/50">
                      <button
                        onClick={() => {
                          returnToAdmin();
                          setShowRoleMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded text-left flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
                        <span>Return to Admin (Dean) Mode</span>
                      </button>
                    </div>
                  )}

                  <div className="py-1">
                    {rolesList.map(r => {
                      const isSelected = currentRole === r.role;
                      return (
                        <button
                          key={r.role}
                          onClick={() => {
                            setRole(r.role);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-indigo-50/70 font-semibold text-[#4F46E5]' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm">{r.icon}</span>
                            <div>
                              <p className="font-bold leading-tight">{r.title}</p>
                              <p className="text-[10px] text-slate-500">{r.subtitle}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#4F46E5] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Copilot Button */}
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-md transition-colors"
            title="Institutional Academic Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors border border-transparent hover:border-slate-200"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {pendingQueriesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC2626] rounded-full ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-2 z-50 animate-in fade-in duration-100">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Institutional Circulars & Alerts
                  </span>
                  <span className="text-[10px] font-semibold text-[#4F46E5] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {recentNotifications.length} Active
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {recentNotifications.map(item => (
                    <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          item.category === 'urgent' ? 'bg-[#DC2626]' :
                          item.category === 'exam' ? 'bg-[#F59E0B]' : 'bg-[#4F46E5]'
                        }`} />
                        <div>
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {item.content}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 inline-block">
                            {item.date} • {item.authorRole}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-[#E2E8F0]"
            >
              <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-wider">
                {getInitials(currentUser.name)}
              </div>
              <div className="hidden sm:block text-left max-w-[130px]">
                <p className="text-xs font-bold text-[#0F172A] truncate leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  {isSimulatingRole ? `Preview: ${currentRole.toUpperCase()}` : (currentUser.designation || currentUser.role.toUpperCase())}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-1.5 w-68 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-2 z-50 animate-in fade-in duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-[#0F172A]">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 uppercase">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                    {isSimulatingRole && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300 uppercase">
                        Preview: {currentRole}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      {currentUser.regId}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  {isSimulatingRole && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        returnToAdmin();
                      }}
                      className="w-full px-4 py-2 text-xs text-left font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100/80 flex items-center gap-2 border-b border-amber-200/60 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      Exit Simulation → Admin View
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigateToProfile();
                    }}
                    className="w-full px-4 py-2 text-xs text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    Official Academic Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-xs text-left font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    Sign Out
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1.5 px-4 pb-1">
                  <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Institutional Identity Verified
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
