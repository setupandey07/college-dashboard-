import React from 'react';
import {
  Users,
  GraduationCap,
  Building2,
  BookOpenCheck,
  AlertTriangle,
  ArrowUpRight,
  Download,
  Megaphone,
  CheckCircle2,
  HelpCircle,
  Clock,
  ShieldCheck,
  Plus,
  ChevronRight,
  Briefcase,
  Lightbulb,
  FolderOpen
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { NavTab } from '../layout/Sidebar';

interface AdminDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const {
    departments,
    sections,
    queries,
    workloads,
    announcements,
    users,
    students,
    innovationProjects,
    syncStatus
  } = useAcademicData();

  // 1. Real dynamic counts from authoritative database
  const totalDepartments = departments.length;

  // Real active classes count belonging to active departments
  const activeDeptCodes = new Set(departments.filter(d => d.status !== 'inactive').map(d => d.code.toUpperCase()));
  const actualClassCount = sections.filter(
    s =>
      s.status !== 'inactive' &&
      (activeDeptCodes.has(s.departmentCode?.toUpperCase()) || departments.some(d => d.id === s.departmentId))
  ).length;

  // Real faculty count: users with role 'faculty' or 'hod' in database (0 if none created)
  const actualFacultyCount = users.filter(u => u.role === 'faculty' || u.role === 'hod').length;

  // Real student count: unique student accounts from users and students collections (0 if none created)
  const studentIds = new Set<string>();
  users.filter(u => u.role === 'student').forEach(u => studentIds.add(u.id || u.email));
  students.forEach(s => studentIds.add(s.userId || s.id || s.email));
  const actualStudentCount = studentIds.size;

  // Real announcements count
  const totalCirculars = announcements.length;

  // Actionable institutional metrics
  const pendingQueries = queries.filter(q => q.status !== 'resolved');
  const overloadedFaculty = workloads.filter(w => w.status === 'overload');
  const recentCirculars = announcements.slice(0, 3);

  // Helper to compute dynamic counts per department
  const getDeptClassCount = (deptCode: string, deptId: string) => {
    return sections.filter(
      s =>
        s.status !== 'inactive' &&
        (s.departmentCode?.toUpperCase() === deptCode.toUpperCase() || s.departmentId === deptId)
    ).length;
  };

  const getDeptFacultyCount = (deptCode: string, deptName: string) => {
    return users.filter(
      u =>
        (u.role === 'faculty' || u.role === 'hod') &&
        (u.departmentCode?.toLowerCase() === deptCode.toLowerCase() ||
          u.department?.toLowerCase() === deptName.toLowerCase())
    ).length;
  };

  const getDeptStudentCount = (deptCode: string, deptName: string) => {
    const sIds = new Set<string>();
    users
      .filter(
        u =>
          u.role === 'student' &&
          (u.departmentCode?.toLowerCase() === deptCode.toLowerCase() ||
            u.department?.toLowerCase() === deptName.toLowerCase())
      )
      .forEach(u => sIds.add(u.id || u.email));
    students
      .filter(
        s =>
          s.departmentName?.toLowerCase() === deptName.toLowerCase() ||
          s.departmentId?.toLowerCase().includes(deptCode.toLowerCase())
      )
      .forEach(s => sIds.add(s.userId || s.id || s.email));
    return sIds.size;
  };

  return (
    <div className="space-y-6">
      {/* Official Institutional Banner */}
      <div className="bg-white rounded-lg p-5 sm:p-6 border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Office of the Dean (Academic Affairs)
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">
                Odd Semester 2026-27
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
              Academic Governance & Monitoring Terminal
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              Consolidated governance across {totalDepartments} academic department{totalDepartments === 1 ? '' : 's'}, {actualClassCount} active class section{actualClassCount === 1 ? '' : 's'}, {actualFacultyCount} teaching appointment{actualFacultyCount === 1 ? '' : 's'}, {actualStudentCount} enrolled student{actualStudentCount === 1 ? '' : 's'}, and official senate circulars.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => onNavigate('announcements')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer active:scale-95"
              title="Publish or manage official Senate circulars"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              Publish Circular
            </button>
            <button
              onClick={() => onNavigate('departments')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100/80 text-[#4F46E5] border border-indigo-200 transition-all cursor-pointer active:scale-95"
              title="Manage academic departments"
            >
              <Building2 className="w-3.5 h-3.5 text-[#4F46E5]" />
              Manage Departments
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 transition-all border border-[#E2E8F0] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Accreditation Dossier
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: 100% Real Database State, Balanced & Clickable (Attendance Removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Departments - Clickable to Departments */}
        <button
          onClick={() => onNavigate('departments')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer relative overflow-hidden"
          title="Click to view and manage academic departments"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
              Departments
            </span>
            <div className="p-1.5 rounded-md bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Building2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{totalDepartments}</span>
            <span className="text-xs text-slate-500 font-medium">UG Programs</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500 truncate">
              {totalDepartments === 0
                ? 'No departments created'
                : `${totalDepartments} active branch${totalDepartments === 1 ? '' : 'es'}`}
            </p>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* 2. Faculty Strength - Dynamic count from users, Clickable to Users */}
        <button
          onClick={() => onNavigate('users')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer relative overflow-hidden"
          title="Click to view and manage faculty accounts in User Directory"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
              Faculty Strength
            </span>
            <div className="p-1.5 rounded-md bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{actualFacultyCount}</span>
            <span className="text-xs text-slate-500 font-medium">Verified Accounts</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">
              {actualFacultyCount === 0
                ? '0 faculty registered in system'
                : `${actualFacultyCount} teaching staff`}
            </p>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* 3. Student Strength - Dynamic count from student accounts, Clickable to Users */}
        <button
          onClick={() => onNavigate('users')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer relative overflow-hidden"
          title="Click to view and manage student accounts in User Directory"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
              Student Strength
            </span>
            <div className="p-1.5 rounded-md bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <GraduationCap className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{actualStudentCount}</span>
            <span className="text-xs text-slate-500 font-medium">Registered</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">
              {actualStudentCount === 0
                ? '0 students registered in system'
                : `${actualStudentCount} enrolled students`}
            </p>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* 4. Published Circulars - Real database count, Clickable to Announcements */}
        <button
          onClick={() => onNavigate('announcements')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-md transition-all text-left group cursor-pointer relative overflow-hidden"
          title="Click to view and publish official Senate circulars"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
              Official Circulars
            </span>
            <div className="p-1.5 rounded-md bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Megaphone className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{totalCirculars}</span>
            <span className="text-xs text-slate-500 font-medium">Active Notices</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">
              {totalCirculars === 0
                ? 'No circulars broadcasted yet'
                : `${totalCirculars} published notifications`}
            </p>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>
      </div>

      {/* Main Grid: Department Matrix & Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Department Academic Matrix (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden shadow-2xs">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#4F46E5]" />
                Department Academic Monitoring Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative department registry, allocated chairs, faculty, and enrolled students
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('departments')}
                className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-[#4F46E5] hover:bg-indigo-100 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {totalDepartments === 0 ? '+ Add Department' : 'Manage Departments'}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {totalDepartments === 0 ? (
            /* Clean Empty State when 0 departments exist */
            <div className="p-8 sm:p-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Building2 className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                0 Academic Departments Established
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
                No academic departments exist in the database yet. Click below to establish your institution's first department (such as CSE, ECE, or Mechanical) with HOD and contact details.
              </p>
              <button
                onClick={() => onNavigate('departments')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                Add First Department
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4">Head of Dept (HOD)</th>
                    <th className="py-3 px-4 text-center">Classes</th>
                    <th className="py-3 px-4 text-center">Faculty</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((dept) => {
                    const deptFaculty = getDeptFacultyCount(dept.code, dept.name);
                    const deptStudents = getDeptStudentCount(dept.code, dept.name);
                    const deptClasses = getDeptClassCount(dept.code, dept.id);
                    return (
                      <tr
                        key={dept.id}
                        onClick={() => onNavigate('departments')}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px] group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200 transition-colors">
                            {dept.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {dept.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {dept.hodName || 'Not Assigned'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-indigo-700 font-mono">{deptClasses}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-slate-800">{deptFaculty}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-slate-800">{deptStudents}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              dept.status === 'inactive'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dept.status === 'inactive' ? 'bg-slate-400' : 'bg-emerald-500'
                              }`}
                            />
                            {dept.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-[#4F46E5] font-semibold text-[11px] group-hover:underline inline-flex items-center gap-0.5">
                            Details <ChevronRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Institutional Action Items & Circulars */}
        <div className="space-y-5">
          {/* Institutional Action Items - All Clickable */}
          <div className="bg-white rounded-lg p-5 border border-[#E2E8F0] shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#4F46E5]" />
                Institutional Action Items
              </h2>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Real-Time</span>
            </div>

            <div className="space-y-2.5">
              {/* Grievances Card - Clicks to Queries */}
              <button
                onClick={() => onNavigate('queries')}
                className="w-full p-3 rounded-md bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                    Pending Student Grievances
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      pendingQueries.length > 0
                        ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    {pendingQueries.length} {pendingQueries.length === 1 ? 'Open' : 'Open'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Student academic and lab queries</span>
                  <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
                    Open Portal <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>

              {/* Faculty Workload Card - Clicks to Workload */}
              <button
                onClick={() => onNavigate('workload')}
                className="w-full p-3 rounded-md bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                    Faculty Teaching Allocations
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {workloads.length} Records
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Weekly contact hours & credits matrix</span>
                  <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
                    View Matrix <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>

              {/* Innovation & R&D Hub - Clicks to Innovation */}
              <button
                onClick={() => onNavigate('innovation')}
                className="w-full p-3 rounded-md bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                    Innovation & Incubation Hub
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {innovationProjects.length} Projects
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Student patents, research & hackathons</span>
                  <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
                    Explore <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>

              {/* Statutory Accreditation & Audits - Clicks to Reports */}
              <button
                onClick={() => onNavigate('reports')}
                className="w-full p-3 rounded-md bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                    NAAC / NBA Accreditation Dossiers
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Audit Hub
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Course Outcomes & statutory compliance</span>
                  <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
                    Generate Reports <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Senate Circulars - Real Data & Clickable */}
          <div className="bg-white rounded-lg p-5 border border-[#E2E8F0] shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#4F46E5]" />
                Recent Senate Circulars
              </h2>
              <button
                onClick={() => onNavigate('announcements')}
                className="text-xs text-[#4F46E5] hover:underline font-semibold cursor-pointer"
              >
                All Notices
              </button>
            </div>

            {recentCirculars.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-500 mb-2">No official circulars published yet.</p>
                <button
                  onClick={() => onNavigate('announcements')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-amber-400" />
                  Publish Circular
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCirculars.map(circular => (
                  <div
                    key={circular.id}
                    onClick={() => onNavigate('announcements')}
                    className="text-xs pb-2 border-b border-slate-100 last:border-0 last:pb-0 hover:bg-slate-50/80 p-1.5 rounded transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {circular.title}
                      </p>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-600 shrink-0">
                        {circular.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {circular.content}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{circular.date}</span>
                      <span>·</span>
                      <span>{circular.authorRole}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
