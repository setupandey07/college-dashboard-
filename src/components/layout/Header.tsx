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
import { filterQueriesForUser } from '../../lib/queryPrivacy';

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
  const { announcements, queries, notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useAcademicData();
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

  const userVisibleQueries = filterQueriesForUser(queries, currentUser, currentRole);
  const pendingQueriesCount = userVisibleQueries.filter(q => q.status === 'open' || q.status === 'in_progress').length;
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
        return `${currentUser.department && currentUser.department !== 'Unassigned Department' ? currentUser.department : 'Academic Department'} / HOD Portal`;
      case 'faculty':
        return `Faculty of Engineering / ${currentUser.department && currentUser.department !== 'Unassigned Department' ? currentUser.department : 'Department'}`;
      case 'lab_assistant':
        return 'Central Computing Facility / Advanced Systems Lab';
      case 'student': {
        const dept = currentUser.departmentCode && currentUser.departmentCode !== 'UNASSIGNED' ? currentUser.departmentCode : 'Undergraduate';
        const sem = currentUser.semester && currentUser.semester > 0 ? ` (Sem ${currentUser.semester})` : '';
        return `Undergraduate Academic Portal / B.Tech ${dept}${sem}`;
      }
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
        return 'Marks & Internal Assessments';
      case 'notes':
        return 'Master Notes & Academic Batches Repository';
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
    <header className="sticky top-0 z-30 bg-white border-b border-[#D9E6DE]">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Global SaaS Search Bar matching reference */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-[#3D6052] hover:text-[#14382C] hover:bg-[#EBF3EE] rounded-lg border border-[#D9E6DE]"
            aria-label="Toggle Navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Reference Search Bar: Search anything — student, faculty, department, course... [⌘ K] */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#6F8B7F] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search anything — student, faculty, department, course..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-12 py-2.5 bg-[#F4F8F6] border border-[#D9E6DE] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B8B67] focus:border-[#1B8B67] text-[#14382C] placeholder-[#6F8B7F] transition-all"
            />
            <div className="absolute right-3 top-2.5 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#EBF3EE] border border-[#D0E2D6] text-[10px] font-semibold text-[#4D6D61]">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right Controls: Live Pill, Role Selector, Notifications, AI Copilot, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Status Pill: ● Live • AY 2026-27 */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#1B6E52] bg-[#EAF5EF] border border-[#CDE5D7] px-3 py-1.5 rounded-full font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[11px]">Live • AY 2026–27</span>
          </div>

          {/* AI Copilot Button */}
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#166E52] bg-[#EBF5EF] hover:bg-[#DEECE2] border border-[#CDE5D7] rounded-xl transition-colors cursor-pointer"
            title="Institutional Academic Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1B8B67]" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* Role Selector Button & Dropdown matching reference */}
          {isDevRoleSwitcherActive && (
            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs transition-all cursor-pointer ${
                  currentRole !== 'admin'
                    ? 'bg-[#FEF3C7] hover:bg-[#FDE68A] border-[#F59E0B]/40 text-[#92400E]'
                    : 'bg-white hover:bg-[#F4F8F6] border-[#D9E6DE] text-[#14382C]'
                }`}
                title="Switch active role view"
              >
                {currentRole !== 'admin' ? (
                  <Eye className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-[#1B8B67]" />
                )}
                <div className="text-left hidden sm:block">
                  <span className={`text-[9px] uppercase font-bold block leading-none ${
                    currentRole !== 'admin' ? 'text-amber-800' : 'text-[#6F8B7F]'
                  }`}>
                    {currentRole !== 'admin' ? 'Visiting' : 'ROLE'}
                  </span>
                  <span className="font-bold leading-tight capitalize text-[#14382C] text-xs">
                    {currentRoleMeta.title}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#6F8B7F]" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-[#D9E6DE] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-2 border-b border-[#EAF0EC]">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6F8B7F]">
                        Role Switcher
                      </p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EAF5EF] text-[#166E52] border border-[#CDE5D7]">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4D6D61] mt-0.5">
                      Switch between roles to manage different sections
                    </p>
                  </div>

                  {currentRole !== 'admin' && (
                    <div className="p-2 border-b border-[#EAF0EC] bg-[#FEF3C7]/40">
                      <button
                        onClick={() => {
                          returnToAdmin();
                          setShowRoleMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs transition-colors shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-white" />
                        <span>Return to Admin Mode</span>
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
                          className={`w-full px-4 py-2 text-left flex items-center justify-between text-xs hover:bg-[#F4F8F6] transition-colors ${
                            isSelected ? 'bg-[#EAF5EF] font-bold text-[#166E52]' : 'text-[#14382C]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm">{r.icon}</span>
                            <div>
                              <p className="font-bold leading-tight">{r.title}</p>
                              <p className="text-[10px] text-[#6F8B7F]">{r.subtitle}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#1B8B67] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Private Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 text-[#4D6D61] hover:text-[#14382C] hover:bg-[#F4F8F6] rounded-xl transition-colors border border-transparent hover:border-[#D9E6DE] cursor-pointer"
              aria-label="Private Notifications"
              title="Personal Notifications & Alerts"
            >
              <Bell className="w-4 h-4 text-[#4D6D61]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#EF4444] text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#D9E6DE] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in duration-100">
                <div className="px-4 py-2.5 border-b border-[#EAF0EC] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                      Private Notifications
                    </span>
                    {unreadNotificationCount > 0 && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        {unreadNotificationCount} New
                      </span>
                    )}
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsRead()}
                      className="text-[10px] font-bold text-[#166E52] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="divide-y divide-[#EAF0EC] max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[#6F8B7F]">
                      <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-medium">No personal notifications</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Direct query replies, attendance updates, and timetable changes will appear here privately.
                      </p>
                    </div>
                  ) : (
                    notifications.map(item => {
                      const isUnread = !item.isRead;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isUnread) markNotificationRead(item.id);
                          }}
                          className={`p-3.5 transition-colors cursor-pointer ${
                            isUnread ? 'bg-[#F4F9F6] hover:bg-[#EAF4EE]' : 'hover:bg-[#F9FBFA]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                item.type === 'alert' || (item.type as any) === 'error'
                                  ? 'bg-[#EF4444]'
                                  : item.type === 'warning'
                                  ? 'bg-[#F59E0B]'
                                  : item.type === 'success'
                                  ? 'bg-[#10B981]'
                                  : 'bg-[#1B8B67]'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs truncate ${isUnread ? 'font-bold text-[#14382C]' : 'font-medium text-slate-700'}`}>
                                  {item.title}
                                </p>
                                {isUnread && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B8B67] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-[#4D6D61] mt-0.5 line-clamp-2">
                                {item.message}
                              </p>
                              <div className="flex items-center justify-between mt-1 text-[10px] text-[#6F8B7F]">
                                <span>{item.senderName ? `From: ${item.senderName}` : 'System'}</span>
                                <span>{item.createdAt ? String(item.createdAt).slice(0, 16).replace('T', ' ') : ''}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {recentNotifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-[#EAF0EC] bg-[#FAFCFA] flex items-center justify-between text-[11px]">
                    <span className="text-[#6F8B7F]">Institutional Circulars:</span>
                    <span className="font-semibold text-[#166E52]">{recentNotifications.length} active announcements</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Dropdown matching reference */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-[#F4F8F6] transition-colors border border-transparent hover:border-[#D9E6DE] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#0E2920] text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-wider shadow-xs">
                {getInitials(currentUser.name)}
              </div>
              <div className="hidden sm:block text-left max-w-[130px]">
                <p className="text-xs font-bold text-[#14382C] truncate leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-[#6F8B7F] font-medium truncate capitalize">
                  {isSimulatingRole ? `Preview: ${currentRole}` : (currentUser.designation || currentUser.role)}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#6F8B7F]" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-68 bg-white border border-[#D9E6DE] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in duration-100">
                <div className="px-4 py-2.5 border-b border-[#EAF0EC]">
                  <p className="text-xs font-bold text-[#14382C]">{currentUser.name}</p>
                  <p className="text-[11px] text-[#6F8B7F] truncate">{currentUser.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF5EF] text-[#166E52] font-semibold border border-[#CDE5D7] uppercase">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                    {isSimulatingRole && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold border border-[#FDE68A] uppercase">
                        Preview: {currentRole}
                      </span>
                    )}
                    <span className="text-[10px] text-[#6F8B7F] font-mono">
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
                      className="w-full px-4 py-2 text-xs text-left font-semibold text-[#92400E] bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] flex items-center gap-2 border-b border-[#FDE68A] transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#B45309]" />
                      Exit Simulation → Admin View
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigateToProfile();
                    }}
                    className="w-full px-4 py-2 text-xs text-left font-medium text-[#14382C] hover:bg-[#F4F8F6] flex items-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#6F8B7F]" />
                    Official Academic Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-xs text-left font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    Sign Out
                  </button>
                </div>

                <div className="border-t border-[#EAF0EC] pt-2 px-4 pb-1">
                  <span className="text-[10px] text-[#1B6E52] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
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
