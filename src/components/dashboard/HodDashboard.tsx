import React, { useState } from 'react';
import {
  Users,
  BookOpenCheck,
  CalendarCheck,
  Briefcase,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Building2,
  ChevronRight,
  Send,
  FileText,
  Clock,
  FlaskConical,
  Award,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';
import { filterQueriesForUser } from '../../lib/queryPrivacy';
import {
  CampusHeroIllustration,
  SmartTechBooksIllustration,
  AcademicExcellenceIllustration
} from '../common/AcademicIllustrations';
import { MetricValueSkeleton } from '../common/LoadingSkeleton';

interface HodDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const HodDashboard: React.FC<HodDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const {
    subjects,
    workloads,
    queries,
    departments,
    users,
    students,
    attendanceSessions,
    sections,
    announcements,
    loadingState,
    errorState
  } = useAcademicData();

  const [selectedTerm, setSelectedTerm] = useState('AY 2026–27 (Odd)');

  // Find department matching currentUser's department or default to first department
  const myDept = departments.find(
    d => d.code === currentUser.departmentCode ||
         (currentUser.department && d.name.toLowerCase().includes(currentUser.department.toLowerCase())) ||
         d.code === 'CSE'
  ) || departments[0] || null;

  const deptCode = myDept?.code || currentUser.departmentCode || 'CSE';
  const deptName = myDept?.name || currentUser.department || 'Academic Department';

  const deptSections = myDept
    ? sections.filter(
        s =>
          s.status !== 'inactive' &&
          (s.departmentCode?.toUpperCase() === myDept.code.toUpperCase() || s.departmentId === myDept.id)
      )
    : sections.filter(s => s.status !== 'inactive');
  const classCount = deptSections.length;

  const deptSubjects = myDept
    ? subjects.filter(s => s.department === myDept.name || s.department === myDept.code)
    : subjects;

  const deptWorkloads = myDept
    ? workloads.filter(w => w.department === myDept.name || w.department === myDept.code)
    : workloads;

  const myVisibleQueries = filterQueriesForUser(queries, currentUser, 'hod');
  const deptQueries = myVisibleQueries.filter(q => q.status !== 'resolved');

  // Dynamic faculty count for this department from users
  const deptFacultyUsers = users.filter(
    u => (u.role === 'faculty' || u.role === 'hod') &&
         (!myDept || u.departmentCode === myDept.code || (myDept.name && u.department?.toLowerCase().includes(myDept.name.toLowerCase())))
  );
  const facultyCount = deptFacultyUsers.length;

  // Dynamic student count for this department from students and users
  const sIds = new Set<string>();
  if (myDept) {
    users.filter(u => u.role === 'student' && (u.departmentCode === myDept.code || u.department?.toLowerCase().includes(myDept.name.toLowerCase())))
      .forEach(u => sIds.add(u.id));
    students.filter(s => s.departmentName?.toLowerCase().includes(myDept.name.toLowerCase()) || s.departmentId?.includes(myDept.code))
      .forEach(s => sIds.add(s.userId || s.id));
  } else {
    students.forEach(s => sIds.add(s.userId || s.id));
  }
  const studentCount = sIds.size;

  // Overloaded faculty count
  const overloadedCount = deptWorkloads.filter(w => w.status === 'overload').length;

  // Average syllabus coverage across department subjects
  const avgSyllabusCoverage = deptSubjects.length > 0
    ? Math.round(
        deptSubjects.reduce((acc, s) => acc + (s.totalHoursPlanned > 0 ? (s.hoursConducted / s.totalHoursPlanned) * 100 : 0), 0) / deptSubjects.length
      )
    : 0;

  // Compute real average attendance from attendance sessions for this department's subjects
  const deptAttSessions = attendanceSessions.filter(
    sess => deptSubjects.some(s => s.id === sess.subjectId || s.code === sess.subjectCode)
  );
  const avgDeptAttendance = deptAttSessions.length > 0
    ? Math.round(
        deptAttSessions.reduce((acc, s) => acc + (s.totalStudents > 0 ? (s.presentCount / s.totalStudents) * 100 : 0), 0) / deptAttSessions.length
      )
    : 0;

  // Department circulars
  const deptAnnouncements = announcements.filter(
    a => a.targetAudience === 'all' || a.targetAudience === 'faculty' || (a.department && a.department.toLowerCase().includes(deptCode.toLowerCase()))
  );

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userDisplayName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Head of Department';

  return (
    <div className="space-y-6">
      {/* 1. Official HOD Department Command Banner */}
      <div className="bg-gradient-to-r from-[#EBF5EF] via-[#EDF6F1] to-[#E5F2EA] border border-[#DCEBE2] rounded-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="z-10 max-w-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">👋</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14382C] tracking-tight">
              {getTimeGreeting()}, {userDisplayName}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs font-bold text-[#1B8B67] bg-[#E0F3E8] px-2.5 py-0.5 rounded-full border border-[#C6E4D2]">
              {deptCode} Department
            </span>
            <span className="text-xs text-[#527568] font-medium">•</span>
            <span className="text-xs text-[#527568] font-medium">HOD Academic Command Center</span>
          </div>
          <p className="text-[#4D6D61] text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Supervising {classCount} class section{classCount === 1 ? '' : 's'}, {facultyCount} faculty member{facultyCount === 1 ? '' : 's'}, and {studentCount} enrolled student{studentCount === 1 ? '' : 's'} across {deptSubjects.length} departmental courses.
          </p>
        </div>

        {/* Right Tagline & Illustration */}
        <div className="relative flex items-center justify-end gap-6 shrink-0 z-10">
          <div className="hidden lg:block text-right">
            <span className="font-serif italic text-lg text-[#2E7D60] font-bold block leading-none">
              Lead
            </span>
            <span className="font-serif italic text-xl text-[#1E5D47] font-extrabold block leading-tight">
              Guide
            </span>
            <span className="font-serif italic text-2xl text-[#164837] font-black block leading-none">
              Excel
            </span>
          </div>
          <div className="w-44 sm:w-56 h-28 sm:h-32 flex items-center justify-center">
            <CampusHeroIllustration className="w-full h-full object-contain drop-shadow-sm" />
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Row (4 cards matching Admin quality) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Department Students */}
        <div
          onClick={() => onNavigate('users')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Department Students</p>
              <MetricValueSkeleton
                isLoading={loadingState.users || loadingState.students}
                error={errorState.users}
                value={studentCount}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                Enrolled in {deptCode}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 2: Department Faculty */}
        <div
          onClick={() => onNavigate('workload')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Department Faculty</p>
              <MetricValueSkeleton
                isLoading={loadingState.users}
                error={errorState.users}
                value={facultyCount}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {overloadedCount > 0 ? `${overloadedCount} Workload Overload` : `${deptWorkloads.length} Allocations`}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 3: Department Attendance */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Department Attendance</p>
              <MetricValueSkeleton
                isLoading={loadingState.attendance}
                error={errorState.attendance}
                value={deptAttSessions.length > 0 ? avgDeptAttendance : 0}
                unit="%"
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {deptAttSessions.length} recorded session{deptAttSessions.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 4: Syllabus Progress */}
        <div
          onClick={() => onNavigate('syllabus')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpenCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Syllabus Coverage</p>
              <MetricValueSkeleton
                isLoading={loadingState.subjects}
                error={errorState.subjects}
                value={avgSyllabusCoverage}
                unit="%"
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {deptSubjects.length} courses tracked
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* 3. Main Body: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. Department Operations Hub (6 Grid Cards) */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div>
                <h2 className="text-sm font-bold text-[#14382C]">Department Academic Overview</h2>
                <p className="text-xs text-[#527568] mt-0.5">
                  Academic monitoring status for {deptName}
                </p>
              </div>

              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
                className="text-xs font-semibold text-[#14382C] bg-[#F4F8F6] border border-[#D9E6DE] rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#1B8B67] cursor-pointer"
              >
                <option value="AY 2026–27 (Odd)">AY 2026–27 (Odd)</option>
                <option value="AY 2025–26 (Even)">AY 2025–26 (Even)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              {/* Card 1: Syllabus Coverage */}
              <div
                onClick={() => onNavigate('syllabus')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center gap-3.5"
              >
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#E2ECE6]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#0EA5E9]"
                      strokeDasharray={`${avgSyllabusCoverage}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-[#14382C]">
                    {avgSyllabusCoverage}%
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#14382C] truncate">Syllabus Adherence</p>
                  <p className="text-[10px] text-[#527568] mt-0.5 truncate">
                    {deptSubjects.length} Department Courses
                  </p>
                  <span className="text-[10px] font-semibold text-emerald-600 inline-flex items-center gap-0.5 mt-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    <span>Audit Ready</span>
                  </span>
                </div>
              </div>

              {/* Card 2: Class Sections */}
              <div
                onClick={() => onNavigate('departments')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">Class Sections</p>
                    <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                      {classCount} Active
                    </p>
                    <p className="text-[10px] text-[#527568]">Section A & B</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Card 3: Lab Operations */}
              <div
                onClick={() => onNavigate('lab_ops')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">Lab Operations</p>
                    <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">Active</p>
                    <p className="text-[10px] text-[#527568]">{myDept?.labsCount || 3} Labs</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Card 4: Marks & CIA Evaluation */}
              <div
                onClick={() => onNavigate('marks')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">CIA Marks Entry</p>
                    <p className="text-[11px] font-semibold text-[#0284C7] mt-0.5">Ongoing</p>
                    <p className="text-[10px] text-[#527568]">{deptSubjects.length} Courses</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Card 5: Student Queries */}
              <div
                onClick={() => onNavigate('queries')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">Student Inquiries</p>
                    <p className="text-[11px] font-semibold text-[#DC2626] mt-0.5">
                      {deptQueries.length} Pending
                    </p>
                    <p className="text-[10px] text-[#1B8B67] font-semibold">Review</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Card 6: Circulars & Notices */}
              <div
                onClick={() => onNavigate('announcements')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">Circulars & Notices</p>
                    <p className="text-[11px] font-semibold text-[#7C3AED] mt-0.5">
                      {deptAnnouncements.length} Active
                    </p>
                    <p className="text-[10px] text-[#1B8B67] font-semibold">View All</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>

          {/* B. Department Course Syllabus Adherence Tracker */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-[#1B8B67]" />
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Course Syllabus Adherence & Completion
                </h3>
              </div>
              <button
                onClick={() => onNavigate('syllabus')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                Update Curriculum
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {deptSubjects.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#6F8B7F]">
                  <p className="font-semibold text-[#14382C]">No courses registered for this department yet.</p>
                  <p className="mt-1">Add courses in Syllabus Coverage to track topic completion.</p>
                </div>
              ) : (
                deptSubjects.map(sub => {
                  const percentage = sub.totalHoursPlanned > 0
                    ? Math.round((sub.hoursConducted / sub.totalHoursPlanned) * 100)
                    : 0;
                  const completedUnits = sub.units ? sub.units.filter(u => u.isCompleted).length : 0;
                  const totalUnitsCount = sub.units?.length || 5;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => onNavigate('syllabus')}
                      className="p-3.5 rounded-xl border border-[#D9E6DE] bg-[#F9FCFA] hover:border-[#1B8B67] transition-all cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EBF3EE] text-[#14382C] border border-[#D9E6DE]">
                              {sub.code}
                            </span>
                            <h4 className="text-xs font-bold text-[#14382C]">{sub.name}</h4>
                            <span className="text-[11px] text-[#527568]">
                              ({sub.credits} Credits)
                            </span>
                          </div>
                          <p className="text-[11px] text-[#527568] mt-1">
                            Instructor: <span className="font-semibold text-[#14382C]">{sub.facultyName || 'Not Assigned'}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-xs">
                          <span className="font-bold text-[#14382C]">
                            {sub.hoursConducted}/{sub.totalHoursPlanned} hrs ({percentage}%)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#EAF5EF] text-[#166E52] border border-[#CDE5D7]">
                            {completedUnits}/{totalUnitsCount} Units Done
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-[#E2ECE6] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentage >= 75 ? 'bg-[#1B8B67]' : 'bg-[#D97706]'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* C. Department Technology & Governance Banner */}
          <div className="bg-gradient-to-r from-[#EBF5EF] to-[#DEF0E5] border border-[#CBE2D4] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#14382C]">
                  NBA / NAAC Departmental Accreditation Hub
                </h3>
                <p className="text-xs text-[#3D6052] font-medium mt-0.5">
                  Automated course outcome attainment • Audit compliance • Performance dossier
                </p>
                <button
                  onClick={() => onNavigate('reports')}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1B8B67] hover:bg-[#167557] transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span>Generate Department Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="w-32 h-20 shrink-0 hidden sm:flex items-center justify-center">
              <SmartTechBooksIllustration className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* A. Academic Excellence Department Focus */}
          <div className="bg-[#F0F8F4] border border-[#D5EADB] rounded-2xl p-5 text-center relative overflow-hidden shadow-xs">
            <div className="w-24 h-20 mx-auto flex items-center justify-center mb-2">
              <AcademicExcellenceIllustration className="w-full h-full object-contain" />
            </div>
            <h3 className="text-sm font-bold text-[#14382C]">{deptCode} Academic Excellence</h3>
            <p className="text-xs text-[#527568] mt-0.5">
              Empowering faculty, mentoring scholars.
            </p>
          </div>

          {/* B. HOD Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#1B8B67]" />
              Department Actions
            </h3>

            <div className="space-y-2">
              {/* 1. Primary Mint Button */}
              <button
                onClick={() => onNavigate('announcements')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1B8B67] to-[#167557] hover:from-[#167557] hover:to-[#125D45] text-white flex items-center justify-between font-bold text-xs shadow-xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4 text-emerald-200" />
                  <span>Publish Department Notice</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 2. Audit Syllabus */}
              <button
                onClick={() => onNavigate('syllabus')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpenCheck className="w-4 h-4 text-[#1B8B67]" />
                  <span>Audit Syllabus Coverage</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 3. Review Faculty Workload */}
              <button
                onClick={() => onNavigate('workload')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-[#1B8B67]" />
                  <span>Manage Faculty Workload</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 4. Monitor Attendance */}
              <button
                onClick={() => onNavigate('attendance')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-4 h-4 text-[#1B8B67]" />
                  <span>Review Class Attendance</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* C. Faculty Workload Allocations */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#1B8B67]" />
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Faculty Teaching Load
                </h3>
              </div>
              <button
                onClick={() => onNavigate('workload')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {deptWorkloads.length === 0 ? (
                <p className="text-xs text-[#6F8B7F] italic text-center py-4">
                  No workload allocations recorded.
                </p>
              ) : (
                deptWorkloads.slice(0, 4).map(f => (
                  <div key={f.facultyId} className="p-3 rounded-xl border border-[#D9E6DE] bg-[#F9FCFA] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#14382C]">{f.facultyName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          f.status === 'overload'
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                            : 'bg-[#EAF5EF] text-[#166E52] border border-[#CDE5D7]'
                        }`}
                      >
                        {f.currentWeeklyHours} hrs/wk
                      </span>
                    </div>
                    <p className="text-[11px] text-[#527568]">
                      {f.designation} • {f.subjectsAssigned ? f.subjectsAssigned.length : 0} Courses Allocated
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* D. Pending Student Inquiries */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Student Queries ({deptQueries.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigate('queries')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                Review All
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {deptQueries.length === 0 ? (
                <p className="text-xs text-[#6F8B7F] italic text-center py-4">
                  No open inquiries in this department.
                </p>
              ) : (
                deptQueries.slice(0, 3).map(q => (
                  <div key={q.id} className="p-3 rounded-xl bg-[#F9FCFA] border border-[#D9E6DE] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-[#14382C] bg-[#EBF3EE] px-1.5 py-0.5 rounded border border-[#D9E6DE]">
                        {q.ticketId}
                      </span>
                      <span className="text-[9px] font-bold text-[#527568] uppercase">
                        {q.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#14382C] font-semibold truncate">{q.title}</p>
                    <p className="text-[11px] text-[#6F8B7F] mt-0.5">
                      Raised by {q.studentName} ({q.usn})
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Institutional Footer Bar */}
      <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#527568] pt-6 pb-2 border-t border-[#D9E6DE] mt-8 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#14382C]">AcademicCore</span>
          <span>v1.0</span>
          <span>|</span>
          <span>{deptName} ({deptCode}) • National Institute of Technology</span>
        </div>
        <div className="italic text-[#3D6052] flex items-center gap-1">
          <span>"Good education is the foundation of a better tomorrow."</span>
          <span>🌱</span>
        </div>
      </footer>
    </div>
  );
};
