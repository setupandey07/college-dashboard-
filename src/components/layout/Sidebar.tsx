import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  BookOpenCheck,
  Briefcase,
  Building2,
  Users,
  MessageSquareWarning,
  Lightbulb,
  FileSpreadsheet,
  Megaphone,
  FlaskConical,
  User,
  GraduationCap,
  BookMarked,
  Compass,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicData } from '../../context/AcademicDataContext';
import { UserRole } from '../../types';
import { SidebarCampusLineArt } from '../common/AcademicIllustrations';

export type NavTab =
  | 'dashboard'
  | 'classrooms'
  | 'attendance'
  | 'marks'
  | 'notes'
  | 'syllabus'
  | 'workload'
  | 'departments'
  | 'users'
  | 'queries'
  | 'innovation'
  | 'mentor_insight'
  | 'reports'
  | 'announcements'
  | 'lab_ops'
  | 'profile';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  section?: 'ACADEMIC MONITORING' | 'FACULTY & INFRASTRUCTURE' | 'GOVERNANCE & SUPPORT';
  badge?: string | number;
  badgeVariant?: 'red' | 'amber' | 'blue' | 'green';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile
}) => {
  const { currentRole, currentUser, actualRole, isSimulatingRole } = useAuth();
  const { queries, studentAttendance } = useAcademicData();

  // Strict User Isolation: personal attendance shortage badge ONLY for authentic student session
  const myStudentAttendance = (actualRole === 'student' && !isSimulatingRole)
    ? studentAttendance.filter(a => {
        if (!a.studentId && !a.usn) return false;
        const sid = (a.studentId || '').toLowerCase();
        const susn = (a.usn || '').toLowerCase();
        const cid = (currentUser.id || '').toLowerCase();
        const creg = (currentUser.regId || '').toLowerCase();
        return (cid && (sid === cid || susn === cid)) || (creg && (sid === creg || susn === creg));
      })
    : [];
  const lowAttendanceCount = myStudentAttendance.filter(a => a.percentage < 75).length;
  const pendingQueriesCount = queries.filter(q => q.status !== 'resolved').length;

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student']
    },
    {
      id: 'classrooms',
      label: currentRole === 'student' ? 'My Classroom' : 'Classrooms',
      icon: GraduationCap,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student']
    },
    {
      id: 'attendance',
      label: 'Attendance Records',
      icon: CalendarCheck,
      roles: ['hod', 'faculty', 'lab_assistant', 'student'],
      badge: currentRole === 'student' && lowAttendanceCount > 0 ? `${lowAttendanceCount} Shortage` : undefined,
      badgeVariant: 'red'
    },
    {
      id: 'marks',
      label: 'Marks & Internal CIA',
      icon: Award,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student']
    },
    {
      id: 'notes',
      label: 'Master Notes & Batches',
      icon: BookMarked,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student']
    },
    {
      id: 'syllabus',
      label: 'Syllabus Coverage',
      icon: BookOpenCheck,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student']
    },
    {
      id: 'workload',
      label: 'Faculty Workload',
      icon: Briefcase,
      roles: ['admin', 'hod', 'faculty']
    },
    {
      id: 'lab_ops',
      label: 'Lab Operations',
      icon: FlaskConical,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant']
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Building2,
      roles: ['admin', 'hod']
    },
    {
      id: 'users',
      label: 'Users & Students',
      icon: Users,
      roles: ['admin', 'hod']
    },
    {
      id: 'queries',
      label: 'Queries & Grievances',
      icon: MessageSquareWarning,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'GOVERNANCE & SUPPORT',
      badge: pendingQueriesCount > 0 ? pendingQueriesCount : undefined,
      badgeVariant: 'red'
    },
    {
      id: 'innovation',
      label: 'Innovation & Research',
      icon: Lightbulb,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'GOVERNANCE & SUPPORT'
    },
    {
      id: 'mentor_insight',
      label: 'Mentor Insight',
      icon: Compass,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'GOVERNANCE & SUPPORT',
      badge: 'New',
      badgeVariant: 'green'
    },
    {
      id: 'reports',
      label: 'Accreditation & Audits',
      icon: FileSpreadsheet,
      roles: ['admin', 'hod', 'faculty'],
      section: 'GOVERNANCE & SUPPORT'
    },
    {
      id: 'announcements',
      label: 'Circulars & Notices',
      icon: Megaphone,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'GOVERNANCE & SUPPORT'
    },
    {
      id: 'profile',
      label: 'Official Profile',
      icon: User,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'GOVERNANCE & SUPPORT'
    }
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(currentRole));
  const mainItems = visibleItems.filter(i => !i.section);
  const governanceItems = visibleItems.filter(i => i.section === 'GOVERNANCE & SUPPORT');

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Mint Sage Institutional Sidebar (#EBF3EE) matching reference design */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#EBF3EE] border-r border-[#D9E6DE] z-50 md:z-20 transition-transform duration-200 ease-in-out flex flex-col justify-between shrink-0 select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 overflow-y-auto flex-1 flex flex-col custom-scrollbar">
          {/* Mobile Header in Drawer */}
          <div className="flex md:hidden items-center justify-between pb-3 mb-3 border-b border-[#D9E6DE]">
            <span className="font-bold text-[#14382C] text-xs tracking-wider uppercase">Portal Navigation</span>
            <button
              onClick={onCloseMobile}
              className="text-[#4D6D61] hover:text-[#14382C] p-1 text-sm rounded hover:bg-[#DEECE2]"
            >
              ✕
            </button>
          </div>

          {/* Institutional Brand Block: Emerald Icon -> AcademicCore -> NIT */}
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#D9E6DE]/80">
            <div className="w-10 h-10 rounded-xl bg-[#1B8B67] flex items-center justify-center text-white shrink-0 shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-[#14382C]">
                  AcademicCore
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#527568] truncate leading-tight mt-0.5">
                National Institute of Technology
              </p>
            </div>
          </div>

          {/* Main Navigation Items */}
          <nav className="space-y-1">
            {mainItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#CEE7D8] text-[#114434] shadow-xs'
                      : 'text-[#3D6052] hover:text-[#14382C] hover:bg-[#DEECE2]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#1B8B67]' : 'text-[#4D6D61]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#1B8B67] text-white'
                          : item.badgeVariant === 'red'
                          ? 'bg-[#EF4444] text-white'
                          : 'bg-[#0284C7] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Governance & Support Section */}
          {governanceItems.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#D9E6DE]/60">
              <p className="px-3 mb-2 text-[10px] font-bold tracking-wider text-[#698A7C] uppercase">
                GOVERNANCE & SUPPORT
              </p>
              <nav className="space-y-1">
                {governanceItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#CEE7D8] text-[#114434] shadow-xs'
                          : 'text-[#3D6052] hover:text-[#14382C] hover:bg-[#DEECE2]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-[#1B8B67]' : 'text-[#4D6D61]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs shrink-0 ${
                            isActive
                              ? 'bg-[#1B8B67] text-white'
                              : item.badgeVariant === 'red'
                              ? 'bg-[#EF4444] text-white'
                              : 'bg-[#F59E0B] text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Reference Bottom Line-Art Campus Illustration & Motto */}
        <div className="p-4 border-t border-[#D9E6DE] bg-[#E5F0E9]/40 flex flex-col items-start gap-1">
          <SidebarCampusLineArt className="w-full h-14 text-[#2A7558]/80 mb-1" />
          <p className="text-[12px] font-semibold text-[#1E4B3D] leading-tight">
            Better Systems
          </p>
          <p className="text-[10px] font-medium text-[#4D6D61] leading-tight">
            for a Brighter Future
          </p>
        </div>
      </aside>
    </>
  );
};
