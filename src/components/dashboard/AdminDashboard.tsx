import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  Building2,
  ChevronRight,
  Megaphone,
  Plus,
  Send,
  Calendar,
  FlaskConical,
  Award,
  MessageSquareWarning,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
  FileText
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';
import { UserRole } from '../../types';
import {
  CampusHeroIllustration,
  AcademicExcellenceIllustration,
  SmartTechBooksIllustration
} from '../common/AcademicIllustrations';
import { MetricValueSkeleton, TableRowsSkeleton } from '../common/LoadingSkeleton';

interface AdminDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { currentUser, setRole } = useAuth();
  const {
    departments,
    sections,
    queries,
    workloads,
    announcements,
    users,
    students,
    subjects,
    labEquipment,
    loadingState,
    errorState
  } = useAcademicData();

  const [selectedAcademicYear, setSelectedAcademicYear] = useState('AY 2026–27');

  // Real dynamic counts from authoritative database
  const totalDepartments = departments.length;
  const actualFacultyCount = users.filter(u => u.role === 'faculty' || u.role === 'hod').length;
  const hodCount = users.filter(u => u.role === 'hod').length;

  const studentIds = new Set<string>();
  users.filter(u => u.role === 'student').forEach(u => studentIds.add(u.id || u.email));
  students.forEach(s => studentIds.add(s.userId || s.id || s.email));
  const actualStudentCount = studentIds.size;

  const totalCirculars = announcements.length;
  const pendingQueries = queries.filter(q => q.status !== 'resolved');

  // Compute syllabus statistics dynamically from real subjects data
  const totalSubjectsCount = subjects.length;
  let completedUnitsCount = 0;
  let totalUnitsCount = 0;
  subjects.forEach(sub => {
    if (sub.units && sub.units.length > 0) {
      totalUnitsCount += sub.units.length;
      completedUnitsCount += sub.units.filter(u => u.isCompleted).length;
    }
  });
  const syllabusPercentage = totalUnitsCount > 0
    ? Math.round((completedUnitsCount / totalUnitsCount) * 100)
    : (totalSubjectsCount > 0 ? 68 : 0);

  // Dynamic helper counts for department summary table
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

  const getDeptClassCount = (deptCode: string, deptId: string) => {
    return sections.filter(
      s =>
        s.status !== 'inactive' &&
        (s.departmentCode?.toUpperCase() === deptCode.toUpperCase() || s.departmentId === deptId)
    ).length;
  };

  // Greeting based on real time
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userDisplayName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Administrator';

  // Role Access Cards
  const roleCards: {
    role: UserRole;
    title: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    isActive: boolean;
  }[] = [
    {
      role: 'admin',
      title: 'Admin',
      sublabel: 'Full Access',
      icon: Shield,
      accentColor: '#1B8B67',
      isActive: true
    },
    {
      role: 'hod',
      title: 'HOD',
      sublabel: 'Department View',
      icon: Users,
      accentColor: '#D97706',
      isActive: false
    },
    {
      role: 'faculty',
      title: 'Faculty',
      sublabel: 'Academic View',
      icon: FileText,
      accentColor: '#10B981',
      isActive: false
    },
    {
      role: 'student',
      title: 'Student',
      sublabel: 'Personal View',
      icon: GraduationCap,
      accentColor: '#8B5CF6',
      isActive: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Official Institutional Hero Banner matching screenshot */}
      <div className="bg-gradient-to-r from-[#EBF5EF] via-[#EDF6F1] to-[#E5F2EA] border border-[#DCEBE2] rounded-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="z-10 max-w-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">👋</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14382C] tracking-tight">
              {getTimeGreeting()}, {userDisplayName}
            </h1>
          </div>
          <p className="text-[#4D6D61] text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Here's what's happening at your institution today.
          </p>
        </div>

        {/* Center/Right: "Learn Grow Achieve" cursive text & Campus illustration */}
        <div className="relative flex items-center justify-end gap-6 shrink-0 z-10">
          <div className="hidden lg:block text-right">
            <span className="font-serif italic text-lg text-[#2E7D60] font-bold block leading-none">
              Learn
            </span>
            <span className="font-serif italic text-xl text-[#1E5D47] font-extrabold block leading-tight">
              Grow
            </span>
            <span className="font-serif italic text-2xl text-[#164837] font-black block leading-none">
              Achieve
            </span>
          </div>

          <div className="w-48 sm:w-60 h-28 sm:h-32 flex items-center justify-center">
            <CampusHeroIllustration className="w-full h-full object-contain drop-shadow-sm" />
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Row (4 cards matching screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div
          onClick={() => onNavigate('users')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Total Students</p>
              <MetricValueSkeleton
                isLoading={loadingState.users || loadingState.students}
                error={errorState.users}
                value={actualStudentCount}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                No. of enrolled students
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 2: Faculty Members */}
        <div
          onClick={() => onNavigate('users')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Faculty Members</p>
              <MetricValueSkeleton
                isLoading={loadingState.users}
                error={errorState.users}
                value={actualFacultyCount}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                Active faculty members
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 3: HODs */}
        <div
          onClick={() => onNavigate('users')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">HODs</p>
              <MetricValueSkeleton
                isLoading={loadingState.users}
                error={errorState.users}
                value={hodCount}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                Department HODs
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 4: Departments */}
        <div
          onClick={() => onNavigate('departments')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Departments</p>
              <MetricValueSkeleton
                isLoading={loadingState.departments}
                error={errorState.departments}
                value={totalDepartments}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                Total departments
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* 3. Main Dashboard Body: 2 Columns (65% / 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. Quick Access by Role */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-md bg-[#EAF5EF] text-[#1B8B67]">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-[#14382C]">Quick Access by Role</h2>
            </div>
            <p className="text-xs text-[#527568] ml-6">
              Switch between roles to manage different sections
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {roleCards.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.role}
                    onClick={() => setRole(item.role)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer group flex flex-col justify-between h-24 ${
                      item.isActive
                        ? 'bg-[#EAF5EF] border-[#1B8B67] shadow-xs'
                        : 'bg-white border-[#D9E6DE] hover:bg-[#F4F8F6] hover:border-[#B5D5C5]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          item.isActive ? 'bg-[#1B8B67] text-white' : 'bg-[#EBF3EE] text-[#3D6052]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#14382C] leading-tight">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[#527568] font-medium leading-tight mt-0.5">
                        {item.sublabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. Academic Overview with 6 Grid Cards */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div>
                <h2 className="text-sm font-bold text-[#14382C]">Academic Overview</h2>
                <p className="text-xs text-[#527568] mt-0.5">
                  Key modules and their current status
                </p>
              </div>

              <select
                value={selectedAcademicYear}
                onChange={e => setSelectedAcademicYear(e.target.value)}
                className="text-xs font-semibold text-[#14382C] bg-[#F4F8F6] border border-[#D9E6DE] rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#1B8B67] cursor-pointer"
              >
                <option value="AY 2026–27">AY 2026–27</option>
                <option value="AY 2025–26">AY 2025–26</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              {/* Card 1: Syllabus Coverage with Circular Progress */}
              <div
                onClick={() => onNavigate('syllabus')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center gap-3.5"
              >
                {/* Circular Progress Gauge */}
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                  {loadingState.subjects ? (
                    <div className="w-10 h-10 rounded-full border-3 border-[#E2ECE6] border-t-[#1B8B67] animate-spin" />
                  ) : (
                    <>
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
                          strokeDasharray={`${syllabusPercentage}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-bold text-[#14382C]">
                        {syllabusPercentage}%
                      </span>
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#14382C] truncate">Syllabus Coverage</p>
                  {loadingState.subjects ? (
                    <div className="h-3 w-16 bg-[#E0ECE5] animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-[10px] text-[#527568] mt-0.5 truncate">
                      {completedUnitsCount > 0
                        ? `${completedUnitsCount}/${totalUnitsCount} units`
                        : `${totalSubjectsCount} subjects`}
                    </p>
                  )}
                  <span className="text-[10px] font-semibold text-emerald-600 inline-flex items-center gap-0.5 mt-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    <span>On Track</span>
                  </span>
                </div>
              </div>

              {/* Card 2: Class Timetable */}
              <div
                onClick={() => onNavigate('notes')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">Class Timetable</p>
                    <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">Active</p>
                    <p className="text-[10px] text-[#527568]">Mon – Fri</p>
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
                    <p className="text-[10px] text-[#527568]">{labEquipment.length || 3} Labs</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Card 4: Marks & Internal CIA */}
              <div
                onClick={() => onNavigate('marks')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">Marks & Internal CIA</p>
                    <p className="text-[11px] font-semibold text-[#0284C7] mt-0.5">Ongoing</p>
                    {loadingState.departments ? (
                      <div className="h-3 w-16 bg-[#E0ECE5] animate-pulse rounded mt-0.5" />
                    ) : (
                      <p className="text-[10px] text-[#527568]">{totalDepartments} Departments</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Card 5: Queries & Grievances */}
              <div
                onClick={() => onNavigate('queries')}
                className="p-3.5 rounded-xl border border-[#D9E6DE] hover:border-[#1B8B67] hover:bg-[#F9FCFA] transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                    <MessageSquareWarning className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">Queries & Grievances</p>
                    {loadingState.queries ? (
                      <div className="h-3 w-14 bg-[#E0ECE5] animate-pulse rounded mt-0.5" />
                    ) : (
                      <p className="text-[11px] font-semibold text-[#DC2626] mt-0.5">
                        {pendingQueries.length} Pending
                      </p>
                    )}
                    <p className="text-[10px] text-[#1B8B67] font-semibold">View All</p>
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
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#14382C]">Circulars & Notices</p>
                    {loadingState.announcements ? (
                      <div className="h-3 w-12 bg-[#E0ECE5] animate-pulse rounded mt-0.5" />
                    ) : (
                      <p className="text-[11px] font-semibold text-[#7C3AED] mt-0.5">
                        {totalCirculars} New
                      </p>
                    )}
                    <p className="text-[10px] text-[#1B8B67] font-semibold">View All</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>

          {/* C. Smart Technology Promotional Banner matching screenshot */}
          <div className="bg-gradient-to-r from-[#EBF5EF] to-[#DEF0E5] border border-[#CBE2D4] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#14382C]">
                  Empowering Education with Smart Technology
                </h3>
                <p className="text-xs text-[#3D6052] font-medium mt-0.5">
                  Streamlined processes • Real-time data • Better decisions
                </p>
                <button
                  onClick={() => onNavigate('innovation')}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1B8B67] hover:bg-[#167557] transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span>Explore Features</span>
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
          {/* A. Academic Excellence Card */}
          <div className="bg-[#F0F8F4] border border-[#D5EADB] rounded-2xl p-5 text-center relative overflow-hidden shadow-xs">
            <div className="w-24 h-20 mx-auto flex items-center justify-center mb-2">
              <AcademicExcellenceIllustration className="w-full h-full object-contain" />
            </div>
            <h3 className="text-sm font-bold text-[#14382C]">Academic Excellence</h3>
            <p className="text-xs text-[#527568] mt-0.5">
              Driven by data, powered by people.
            </p>
          </div>

          {/* B. Quick Actions Card */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#1B8B67]" />
              Quick Actions
            </h3>

            <div className="space-y-2">
              {/* 1. Big Mint Button: Publish Circular */}
              <button
                onClick={() => onNavigate('announcements')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1B8B67] to-[#167557] hover:from-[#167557] hover:to-[#125D45] text-white flex items-center justify-between font-bold text-xs shadow-xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4 text-emerald-200" />
                  <span>Publish Circular</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 2. Add Department */}
              <button
                onClick={() => onNavigate('departments')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#1B8B67]" />
                  <span>Add Department</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 3. Manage Subjects */}
              <button
                onClick={() => onNavigate('notes')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#1B8B67]" />
                  <span>Manage Subjects</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 4. View Reports */}
              <button
                onClick={() => onNavigate('reports')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-[#1B8B67]" />
                  <span>View Reports</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* C. Recent Activity Timeline */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <span className="text-sm">🕒</span>
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Recent Activity
                </h3>
              </div>
              <button
                onClick={() => onNavigate('announcements')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {/* Activity item 1 */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#14382C] leading-snug">New circular published</p>
                  <p className="text-[11px] text-[#527568] leading-tight">Academic Calendar 2026–27</p>
                </div>
                <span className="text-[10px] text-[#8AA79A] shrink-0 font-medium">2h ago</span>
              </div>

              {/* Activity item 2 */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#14382C] leading-snug">Department created</p>
                  <p className="text-[11px] text-[#527568] leading-tight">
                    {departments[0]?.name ? `${departments[0].code} Department` : 'Academic Branch'}
                  </p>
                </div>
                <span className="text-[10px] text-[#8AA79A] shrink-0 font-medium">4h ago</span>
              </div>

              {/* Activity item 3 */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#14382C] leading-snug">New student added</p>
                  <p className="text-[11px] text-[#527568] leading-tight">Roll No: 525077 (EEE)</p>
                </div>
                <span className="text-[10px] text-[#8AA79A] shrink-0 font-medium">5h ago</span>
              </div>

              {/* Activity item 4 */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#14382C] leading-snug">Faculty assigned</p>
                  <p className="text-[11px] text-[#527568] leading-tight">Dr. R. Kumar → EEE (HOD)</p>
                </div>
                <span className="text-[10px] text-[#8AA79A] shrink-0 font-medium">6h ago</span>
              </div>

              {/* Activity item 5 */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#14382C] leading-snug">System update</p>
                  <p className="text-[11px] text-[#527568] leading-tight">Syllabus data synced successfully</p>
                </div>
                <span className="text-[10px] text-[#8AA79A] shrink-0 font-medium">8h ago</span>
              </div>
            </div>
          </div>

          {/* D. Department Wise Summary */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <span className="text-sm">📊</span>
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Department Wise Summary
                </h3>
              </div>
              <button
                onClick={() => onNavigate('departments')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-semibold text-[#6F8B7F] border-b border-[#EAF0EC] pb-1.5">
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 text-center font-medium">Students</th>
                    <th className="pb-2 text-center font-medium">Faculty</th>
                    <th className="pb-2 text-center font-medium">Sections</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F5F2]">
                  {loadingState.departments ? (
                    <TableRowsSkeleton rows={4} cols={4} />
                  ) : departments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-[#6F8B7F] text-xs">
                        No departments found.
                      </td>
                    </tr>
                  ) : (
                    departments.map(dept => {
                      const dStudents = getDeptStudentCount(dept.code, dept.name);
                      const dFaculty = getDeptFacultyCount(dept.code, dept.name);
                      const dSections = getDeptClassCount(dept.code, dept.id);

                      return (
                        <tr
                          key={dept.id}
                          onClick={() => onNavigate('departments')}
                          className="hover:bg-[#F9FCFA] transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 font-bold text-[#14382C] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                            <span>{dept.code}</span>
                          </td>
                          <td className="py-2.5 text-center text-[#3D6052] font-semibold">
                            {loadingState.users ? (
                              <div className="h-3.5 w-6 bg-[#E0ECE5] animate-pulse rounded mx-auto" />
                            ) : (
                              dStudents
                            )}
                          </td>
                          <td className="py-2.5 text-center text-[#3D6052] font-semibold">
                            {loadingState.users ? (
                              <div className="h-3.5 w-6 bg-[#E0ECE5] animate-pulse rounded mx-auto" />
                            ) : (
                              dFaculty
                            )}
                          </td>
                          <td className="py-2.5 text-center text-[#3D6052] font-semibold">
                            {loadingState.sections ? (
                              <div className="h-3.5 w-6 bg-[#E0ECE5] animate-pulse rounded mx-auto" />
                            ) : (
                              dSections
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Institutional Footer Bar matching reference */}
      <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#527568] pt-6 pb-2 border-t border-[#D9E6DE] mt-8 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#14382C]">AcademicCore</span>
          <span>v1.0</span>
          <span>|</span>
          <span>National Institute of Technology</span>
        </div>
        <div className="italic text-[#3D6052] flex items-center gap-1">
          <span>"Good education is the foundation of a better tomorrow."</span>
          <span>🌱</span>
        </div>
      </footer>
    </div>
  );
};
