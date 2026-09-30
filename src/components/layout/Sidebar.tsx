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
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicData } from '../../context/AcademicDataContext';
import { UserRole } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'attendance'
  | 'marks'
  | 'syllabus'
  | 'workload'
  | 'departments'
  | 'users'
  | 'queries'
  | 'innovation'
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
  section: 'ACADEMIC MONITORING' | 'FACULTY & INFRASTRUCTURE' | 'GOVERNANCE & SUPPORT';
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
    ? studentAttendance.filter(a => Boolean(a.studentId) && (a.studentId === currentUser.id || a.studentId === currentUser.regId))
    : [];
  const lowAttendanceCount = myStudentAttendance.filter(a => a.percentage < 75).length;
  const pendingQueriesCount = queries.filter(q => q.status !== 'resolved').length;

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'ACADEMIC MONITORING'
    },
    {
      id: 'attendance',
      label: 'Attendance Records',
      icon: CalendarCheck,
      roles: ['hod', 'faculty', 'lab_assistant', 'student'],
      section: 'ACADEMIC MONITORING',
      badge: currentRole === 'student' && lowAttendanceCount > 0 ? `${lowAttendanceCount} Shortage` : undefined,
      badgeVariant: 'red'
    },
    {
      id: 'marks',
      label: 'Marks & Internal CIA',
      icon: Award,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'ACADEMIC MONITORING'
    },
    {
      id: 'syllabus',
      label: 'Syllabus Coverage',
      icon: BookOpenCheck,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'ACADEMIC MONITORING'
    },
    {
      id: 'workload',
      label: 'Faculty Workload',
      icon: Briefcase,
      roles: ['admin', 'hod', 'faculty'],
      section: 'FACULTY & INFRASTRUCTURE'
    },
    {
      id: 'lab_ops',
      label: 'Lab Operations',
      icon: FlaskConical,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant'],
      section: 'FACULTY & INFRASTRUCTURE'
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Building2,
      roles: ['admin', 'hod'],
      section: 'FACULTY & INFRASTRUCTURE'
    },
    {
      id: 'users',
      label: 'Users & Students',
      icon: Users,
      roles: ['admin', 'hod'],
      section: 'FACULTY & INFRASTRUCTURE'
    },
    {
      id: 'queries',
      label: 'Queries & Grievances',
      icon: MessageSquareWarning,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'GOVERNANCE & SUPPORT',
      badge: pendingQueriesCount > 0 ? pendingQueriesCount : undefined,
      badgeVariant: 'amber'
    },
    {
      id: 'innovation',
      label: 'Innovation & Research',
      icon: Lightbulb,
      roles: ['admin', 'hod', 'faculty', 'lab_assistant', 'student'],
      section: 'GOVERNANCE & SUPPORT'
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

  const sections: Array<'ACADEMIC MONITORING' | 'FACULTY & INFRASTRUCTURE' | 'GOVERNANCE & SUPPORT'> = [
    'ACADEMIC MONITORING',
    'FACULTY & INFRASTRUCTURE',
    'GOVERNANCE & SUPPORT'
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Deep Navy Institutional Sidebar (#0F172A) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#0F172A] border-r border-slate-800/80 z-50 md:z-20 transition-transform duration-200 ease-in-out flex flex-col justify-between shrink-0 select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 overflow-y-auto flex-1">
          {/* Mobile Header in Drawer */}
          <div className="flex md:hidden items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="font-bold text-white text-xs tracking-wider uppercase">Portal Navigation</span>
            <button
              onClick={onCloseMobile}
              className="text-slate-400 hover:text-white p-1 text-sm"
            >
              ✕
            </button>
          </div>

          {/* Institutional Brand Block: Dark Navy -> Institute Logo -> AcademicCore -> Institute Name */}
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white shrink-0 shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">
                  Academic<span className="text-[#818CF8]">Core</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  NIT
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#94A3B8] truncate leading-tight mt-0.5">
                National Institute of Technology
              </p>
            </div>
          </div>

          {/* Current Persona Badge */}
          <div className="mb-4 px-3 py-2 rounded-md bg-[#1E293B]/70 border border-slate-800 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[9px] uppercase font-bold text-[#94A3B8] tracking-wider block">
                Portal View
              </span>
              <span className="text-xs font-semibold text-white capitalize truncate block">
                {currentRole.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-[10px] font-semibold text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active
            </div>
          </div>

          {/* Navigation by Sections */}
          <div className="space-y-4">
            {sections.map(sectionName => {
              const itemsInSection = visibleItems.filter(i => i.section === sectionName);
              if (itemsInSection.length === 0) return null;

              return (
                <div key={sectionName}>
                  <p className="px-2 mb-1.5 text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase">
                    {sectionName}
                  </p>
                  <nav className="space-y-0.5">
                    {itemsInSection.map(item => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectTab(item.id);
                            onCloseMobile();
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#1E293B] text-white font-semibold shadow-2xs'
                              : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-[#818CF8]' : 'text-[#94A3B8]'
                              }`}
                            />
                            <span>{item.label}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                isActive
                                  ? 'bg-[#4F46E5] text-white'
                                  : item.badgeVariant === 'red'
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : item.badgeVariant === 'amber'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
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
              );
            })}
          </div>
        </div>

        {/* User / Version Information footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0B1120]">
          <div className="px-2 py-1 text-[11px] text-[#94A3B8]">
            <p className="text-white font-medium">AcademicCore Enterprise</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Autonomous Academic ERP v2.4</p>
          </div>
        </div>
      </aside>
    </>
  );
};
