import React, { useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  Award,
  AlertOctagon,
  Lightbulb,
  CheckCircle2,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Clock,
  HelpCircle,
  Megaphone,
  Building2,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Users,
  Send,
  BookMarked,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';
import { resolveStudentAttendance, computeAttendanceAggregate } from '../../lib/attendanceCalculations';
import { TimetableDay, DEFAULT_TIMETABLE_SLOTS } from '../../services/firestore';
import {
  CampusHeroIllustration,
  SmartTechBooksIllustration,
  AcademicExcellenceIllustration
} from '../common/AcademicIllustrations';
import { MetricValueSkeleton } from '../common/LoadingSkeleton';

interface StudentDashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAiAssistant?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigate,
  onOpenAiAssistant
}) => {
  const { currentUser, actualRole, isSimulatingRole } = useAuth();
  const {
    subjects,
    studentAttendance,
    attendanceSessions,
    studentMarks,
    innovationProjects,
    queries,
    announcements,
    sections,
    departments,
    students,
    users,
    timetables,
    loadingState,
    errorState
  } = useAcademicData();

  // Strict Real User Check: Real Student account vs Administrator role preview
  const isRealStudent = actualRole === 'student';

  // Target student identity: ONLY authentic student sees their own records. Admin never impersonates another student.
  const targetStudentId = isRealStudent ? currentUser.id : '';
  const targetRegId = isRealStudent ? currentUser.regId : '';

  // Student specific class section
  const studentDeptCode = isRealStudent
    ? (currentUser.departmentCode && currentUser.departmentCode !== 'UNASSIGNED' ? currentUser.departmentCode : 'CSE')
    : (currentUser.departmentCode && currentUser.departmentCode !== 'UNASSIGNED' ? currentUser.departmentCode : (departments[0]?.code || 'CSE'));
  const studentDeptName = isRealStudent
    ? (currentUser.department || 'Academic Department')
    : (currentUser.department || departments[0]?.name || 'Computer Science and Engineering');
  const studentSem = isRealStudent ? (currentUser.semester || 0) : (currentUser.semester || 0);
  const studentSec = isRealStudent ? (currentUser.section || '') : (currentUser.section || '');
  const normalizedSec = (studentSec || '').replace(/^Section\s+/i, '').trim().toUpperCase();

  // Filter subjects matching department, semester, and section
  const myClassSubjects = subjects.filter(s => {
    const sDept = (s.department || '').trim().toLowerCase();
    const deptMatch =
      !s.department ||
      sDept === studentDeptCode.toLowerCase() ||
      sDept === studentDeptName.toLowerCase();
    const semMatch = !s.semester || studentSem === 0 || s.semester === studentSem;
    const sSecNorm = (s.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
    const secMatch = !s.section || s.section === 'All' || !normalizedSec || sSecNorm === normalizedSec;
    return deptMatch && semMatch && secMatch;
  });

  // Filter section details
  const mySection = sections.find(
    s =>
      (s.departmentCode?.toLowerCase() === studentDeptCode.toLowerCase() ||
        s.departmentName?.toLowerCase() === studentDeptName.toLowerCase()) &&
      (!s.semester || studentSem === 0 || s.semester === studentSem) &&
      (!studentSec ||
        s.sectionName.toLowerCase() === studentSec.toLowerCase() ||
        s.sectionName.toLowerCase() === `section ${studentSec.toLowerCase()}` ||
        s.sectionName.replace(/^Section\s+/i, '').toLowerCase() === normalizedSec.toLowerCase())
  );

  // Assessment marks for target student: Strictly isolated to authenticated student (0 for Admin)
  const myMarks = isRealStudent
    ? studentMarks.filter(
        sm => Boolean(sm.studentId) && (
          (targetStudentId && (sm.studentId === targetStudentId || sm.studentId === targetRegId)) ||
          (targetRegId && sm.studentId === targetRegId)
        )
      )
    : [];

  // Authoritative real database attendance records: Strictly isolated to authenticated student (0 for Admin)
  const effectiveAttendance = isRealStudent
    ? resolveStudentAttendance(
        targetStudentId,
        targetRegId,
        attendanceSessions,
        studentAttendance
      )
    : [];

  // AUTOMATIC ATTENDANCE CALCULATIONS
  const { totalClasses, attendedClasses: totalAttended, absentClasses: totalAbsent, percentage: overallPercentage } =
    computeAttendanceAggregate(effectiveAttendance);

  // Low attendance subjects (< 75%)
  const shortageSubjects = isRealStudent ? effectiveAttendance.filter(a => a.percentage < 75) : [];

  // Real database assessment records for student
  const enteredSubjectMarks = myMarks.filter(sm =>
    sm.minor1 !== null || sm.minor2 !== null || sm.midSem !== null || sm.endSem !== null
  );

  // Filter innovation projects strictly for current real user
  const myProjects = isRealStudent
    ? innovationProjects.filter(
        p => (p.leadStudent && p.leadStudent.toLowerCase().includes(currentUser.name.toLowerCase())) ||
             (p.teamMembers && p.teamMembers.some(m => m.toLowerCase().includes(currentUser.name.toLowerCase())))
      )
    : [];

  const myQueries = isRealStudent
    ? queries.filter(q => q.studentId === targetStudentId || q.usn === targetRegId)
    : [];

  // Filter announcements for student
  const myNotices = announcements.filter(
    a =>
      a.targetAudience === 'all' ||
      a.targetAudience === 'students' ||
      (a.department && a.department.toLowerCase() === studentDeptCode.toLowerCase())
  );

  // Canonical Database Timetable Integration: Synchronize strictly with Firestore timetables
  const dayNames: TimetableDay[] = ['Monday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Monday'];
  const todayDayIndex = new Date().getDay();
  const currentWeekDay: TimetableDay = dayNames[todayDayIndex] || 'Monday';

  // Find timetable belonging to the student's section
  const studentTimetable = timetables.find(t =>
    (mySection && (t.sectionId === mySection.id || t.id === mySection.id)) ||
    (t.departmentCode?.toLowerCase() === studentDeptCode.toLowerCase() &&
     (t.sectionName?.toLowerCase() === normalizedSec.toLowerCase() ||
      t.sectionName?.toLowerCase() === studentSec.toLowerCase()))
  );

  const todayStudentSlots: {
    slotId: string;
    timeLabel: string;
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    room: string;
    type?: string;
  }[] = [];

  if (studentTimetable && studentTimetable.schedule?.[currentWeekDay]) {
    const slotsCfg = studentTimetable.slotsConfig || DEFAULT_TIMETABLE_SLOTS;
    slotsCfg.forEach(slot => {
      const cell = studentTimetable.schedule[currentWeekDay]?.[slot.id];
      if (cell) {
        todayStudentSlots.push({
          slotId: slot.id,
          timeLabel: `${slot.timeRange} (${slot.label})`,
          subjectCode: cell.subjectCode,
          subjectName: cell.subjectName,
          facultyName: cell.facultyName || 'Instructor',
          room: cell.roomNumber || cell.room || mySection?.roomNumber || 'Room 101',
          type: cell.type
        });
      }
    });
  }

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userDisplayName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Student';

  return (
    <div className="space-y-6">
      {/* Role Preview Banner for Administrator Testing (Strictly NO switch student selector) */}
      {isSimulatingRole && (
        <div className="bg-[#FEF3C7] border border-[#F59E0B]/40 rounded-2xl p-4 text-xs animate-in fade-in flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-[#92400E]">
            <ShieldCheck className="w-5 h-5 text-[#D97706] shrink-0" />
            <div>
              <p className="font-bold">Role Simulation Mode — Student Academic View</p>
              <p className="text-[11px] text-[#B45309]">
                Viewing student portal layout as Administrator ({currentUser.name}). Individual student records remain private and isolated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Official Student Hero Banner */}
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
              {studentDeptCode} {studentSem > 0 ? `• Sem ${studentSem}` : ''} {studentSec ? `• Sec ${studentSec}` : ''}
            </span>
            <span className="text-xs text-[#527568] font-medium">•</span>
            <span className="text-xs text-[#527568] font-medium">
              {isRealStudent ? 'Undergraduate Scholar' : 'Administrator Portal Preview'}
            </span>
          </div>
          <p className="text-[#4D6D61] text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            {isRealStudent ? (
              <>
                Roll No / USN: <strong className="font-mono text-[#14382C]">{currentUser.regId}</strong> • Enrolled in {myClassSubjects.length} courses across {studentDeptName}.
              </>
            ) : (
              <>
                Administrator Session (<strong className="text-[#14382C]">{currentUser.name}</strong>) • Personal academic records are strictly restricted to authenticated students.
              </>
            )}
          </p>
        </div>

        {/* Right Tagline & Illustration */}
        <div className="relative flex items-center justify-end gap-6 shrink-0 z-10">
          <div className="hidden lg:block text-right">
            <span className="font-serif italic text-lg text-[#2E7D60] font-bold block leading-none">
              Learn
            </span>
            <span className="font-serif italic text-xl text-[#1E5D47] font-extrabold block leading-tight">
              Strive
            </span>
            <span className="font-serif italic text-2xl text-[#164837] font-black block leading-none">
              Succeed
            </span>
          </div>
          <div className="w-44 sm:w-56 h-28 sm:h-32 flex items-center justify-center">
            <CampusHeroIllustration className="w-full h-full object-contain drop-shadow-sm" />
          </div>
        </div>
      </div>

      {/* Shortage Alert Banner if any subject < 75% */}
      {shortageSubjects.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] flex items-start gap-3 shadow-xs">
          <AlertOctagon className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <h3 className="font-bold text-[#991B1B]">
              Statutory Attendance Shortage Warning ({shortageSubjects.length} Course{shortageSubjects.length === 1 ? '' : 's'} Below 75% Cutoff)
            </h3>
            <p className="text-[#B91C1C] mt-1 text-xs leading-relaxed">
              University regulations require a minimum 75% aggregate attendance to remain eligible for End-Semester examinations.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {shortageSubjects.map(s => {
                const requiredClasses = Math.ceil((0.75 * s.totalClasses - s.attendedClasses) / (1 - 0.75));
                return (
                  <span
                    key={s.subjectId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-[#991B1B] font-bold border border-[#FECACA] text-xs shadow-2xs"
                  >
                    {s.subjectCode}: {s.percentage}% ({s.attendedClasses}/{s.totalClasses}) — Attend next {Math.max(1, requiredClasses)} class{Math.max(1, requiredClasses) === 1 ? '' : 'es'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Metric Cards Row (4 cards matching Admin quality) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Aggregate Attendance */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Aggregate Attendance</p>
              {loadingState.attendance ? (
                <div className="h-7 sm:h-8 w-20 bg-[#E0ECE5] animate-pulse rounded-md mt-1" />
              ) : (
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-2xl sm:text-3xl font-black ${
                    totalClasses === 0 ? 'text-[#14382C]' : overallPercentage >= 75 ? 'text-[#166E52]' : 'text-[#DC2626]'
                  }`}>
                    {totalClasses > 0 ? `${overallPercentage}%` : '0%'}
                  </span>
                  <span className="text-[11px] font-medium text-[#719184]">
                    {totalAttended}/{totalClasses}
                  </span>
                </div>
              )}
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {loadingState.attendance ? (
                  <span className="inline-block h-3 w-24 bg-[#E0ECE5] animate-pulse rounded" />
                ) : totalClasses === 0 ? (
                  'No sessions logged'
                ) : overallPercentage >= 75 ? (
                  'Eligible for Exams'
                ) : (
                  'Shortage Alert'
                )}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 2: Course CIA Assessments */}
        <div
          onClick={() => onNavigate('marks')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">CIA Assessments</p>
              <MetricValueSkeleton
                isLoading={loadingState.marks}
                error={errorState.marks}
                value={enteredSubjectMarks.length}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {enteredSubjectMarks.length > 0 ? `${enteredSubjectMarks.length} evaluated courses` : 'Pending evaluations'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 3: Enrolled Subjects */}
        <div
          onClick={() => onNavigate('syllabus')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Enrolled Subjects</p>
              <MetricValueSkeleton
                isLoading={loadingState.subjects}
                error={errorState.subjects}
                value={myClassSubjects.length}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                Sem {studentSem} • Section {studentSec}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 4: Inquiries & R&D */}
        <div
          onClick={() => onNavigate('queries')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Student Inquiries</p>
              <MetricValueSkeleton
                isLoading={loadingState.queries}
                error={errorState.queries}
                value={myQueries.length}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                Academic & Redressal
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
          {/* A0. Today's Academic Timetable (Database Synchronized) */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1B8B67]" />
                <h2 className="text-sm font-bold text-[#14382C]">
                  Today's Class Timetable — {currentWeekDay} ({studentDeptCode} {mySection?.sectionName || studentSec || 'Class'})
                </h2>
              </div>
              <span className="text-[11px] font-bold text-[#166E52] bg-[#EAF5EF] px-2.5 py-0.5 rounded-full border border-[#CDE5D7]">
                Live Database Schedule
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {todayStudentSlots.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#6F8B7F]">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-[#14382C]">No lectures scheduled for {currentWeekDay}.</p>
                  <p className="mt-1 text-[11px]">
                    Your class timetable updates in real time as your department HOD or Administrator configures schedule slots.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {todayStudentSlots.map((slot) => (
                    <div
                      key={slot.slotId}
                      className="p-3.5 rounded-xl border border-[#D9E6DE] bg-[#F9FCFA] hover:border-[#1B8B67] transition-all space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-[#14382C] bg-[#EBF3EE] px-2 py-0.5 rounded border border-[#D9E6DE] text-[10px]">
                          {slot.subjectCode}
                        </span>
                        <span className="text-[10px] text-[#6F8B7F] font-medium">
                          {slot.timeLabel}
                        </span>
                      </div>
                      <h3 className="font-bold text-[#14382C] text-xs line-clamp-1">{slot.subjectName}</h3>
                      <div className="flex items-center justify-between text-[11px] text-[#527568] pt-1 border-t border-[#EAF0EC]">
                        <span>Prof: {slot.facultyName}</span>
                        <span className="font-semibold text-slate-700">{slot.room}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* A. Subject-wise Attendance & Curriculum Adherence */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1B8B67]" />
                <h2 className="text-sm font-bold text-[#14382C]">
                  Course Curriculum & Attendance Status ({studentDeptCode} Sem {studentSem})
                </h2>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                Detailed Records
              </button>
            </div>

            <div className="mt-4">
              {loadingState.subjects ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[1, 2].map(i => (
                    <div key={i} className="p-4 rounded-xl border border-[#D9E6DE] bg-[#F9FCFA] animate-pulse space-y-3">
                      <div className="h-4 w-32 bg-[#E0ECE5] rounded" />
                      <div className="h-3 w-48 bg-[#E0ECE5] rounded" />
                    </div>
                  ))}
                </div>
              ) : myClassSubjects.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6F8B7F]">
                  <p className="font-semibold text-[#14382C]">No subjects assigned to your class yet.</p>
                  <p className="mt-1">Courses created for your department and semester will appear here automatically.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {myClassSubjects.map(sub => {
                    const totalTopics = sub.units?.reduce((acc, u) => acc + (u.topics?.length || 0), 0) || 0;
                    const completedTopics = sub.units?.reduce(
                      (acc, u) => acc + (u.topics?.filter(t => t.completed)?.length || 0),
                      0
                    ) || 0;
                    const coverage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

                    const subAtt = effectiveAttendance.find(
                      a => a.subjectCode === sub.code || a.subjectId === sub.id
                    );
                    const isWarning = subAtt && subAtt.totalClasses > 0 && subAtt.percentage < 75;

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl border border-[#D9E6DE] bg-[#F9FCFA] hover:border-[#1B8B67] transition-all space-y-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#EBF3EE] text-[#14382C] border border-[#D9E6DE] rounded">
                              {sub.code}
                            </span>
                            <h3 className="font-bold text-[#14382C] mt-1 text-xs line-clamp-1">{sub.name}</h3>
                            <p className="text-[11px] text-[#527568] mt-0.5">Faculty: {sub.facultyName || 'Instructor'}</p>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#EAF5EF] text-[#166E52] border border-[#CDE5D7]">
                            {sub.credits} Credits
                          </span>
                        </div>

                        {/* Attendance Progress */}
                        {subAtt && subAtt.totalClasses > 0 ? (
                          <div className="pt-2 border-t border-[#EAF0EC]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#527568]">Attendance</span>
                              <span className={`font-bold font-mono ${isWarning ? 'text-[#DC2626]' : 'text-[#166E52]'}`}>
                                {subAtt.percentage}% ({subAtt.attendedClasses}/{subAtt.totalClasses})
                              </span>
                            </div>
                            <div className="w-full bg-[#E2ECE6] h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full transition-all ${isWarning ? 'bg-[#DC2626]' : 'bg-[#1B8B67]'}`}
                                style={{ width: `${Math.min(100, subAtt.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-[#EAF0EC] flex items-center justify-between text-[11px] text-[#8AA79A]">
                            <span>Attendance Sessions:</span>
                            <span className="italic">Pending records</span>
                          </div>
                        )}

                        {/* Syllabus Coverage Progress */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-[#527568] mb-1">
                            <span>Syllabus Covered</span>
                            <span className="font-bold text-[#14382C]">{coverage}%</span>
                          </div>
                          <div className="w-full bg-[#E2ECE6] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0284C7] h-full rounded-full transition-all"
                              style={{ width: `${coverage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* B. Master Notes & Repository Promotional Banner */}
          <div className="bg-gradient-to-r from-[#EBF5EF] to-[#DEF0E5] border border-[#CBE2D4] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <BookMarked className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#14382C]">
                  Master Notes & Batches Repository
                </h3>
                <p className="text-xs text-[#3D6052] font-medium mt-0.5">
                  Official lecture slides, lab manuals, and approved revision modules
                </p>
                <button
                  onClick={() => onNavigate('notes')}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1B8B67] hover:bg-[#167557] transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span>Open Master Notes</span>
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
          {/* A. Academic Excellence */}
          <div className="bg-[#F0F8F4] border border-[#D5EADB] rounded-2xl p-5 text-center relative overflow-hidden shadow-xs">
            <div className="w-24 h-20 mx-auto flex items-center justify-center mb-2">
              <AcademicExcellenceIllustration className="w-full h-full object-contain" />
            </div>
            <h3 className="text-sm font-bold text-[#14382C]">Scholar Academic Progress</h3>
            <p className="text-xs text-[#527568] mt-0.5">
              Knowledge is the currency of the future.
            </p>
          </div>

          {/* B. Student Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#1B8B67]" />
              Student Actions
            </h3>

            <div className="space-y-2">
              {/* 1. Primary Action */}
              <button
                onClick={() => onNavigate('notes')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1B8B67] to-[#167557] hover:from-[#167557] hover:to-[#125D45] text-white flex items-center justify-between font-bold text-xs shadow-xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <BookMarked className="w-4 h-4 text-emerald-200" />
                  <span>Access Master Notes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 2. Check CIA Marks */}
              <button
                onClick={() => onNavigate('marks')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-[#1B8B67]" />
                  <span>View Assessment Marks</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 3. Raise Query */}
              <button
                onClick={() => onNavigate('queries')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-[#1B8B67]" />
                  <span>Submit Academic Query</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 4. Innovation Proposal */}
              <button
                onClick={() => onNavigate('innovation')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Lightbulb className="w-4 h-4 text-[#1B8B67]" />
                  <span>Propose R&D Project</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* C. Weekly Class Schedule Widget */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1B8B67]" />
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Class Timetable
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#166E52] bg-[#EAF5EF] px-2 py-0.5 rounded-full border border-[#CDE5D7]">
                Sem {studentSem}
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              {todayStudentSlots.length === 0 ? (
                <p className="text-xs text-[#6F8B7F] italic text-center py-4">
                  No scheduled classes for {currentWeekDay}.
                </p>
              ) : (
                todayStudentSlots.slice(0, 4).map(slot => (
                  <div key={slot.slotId} className="p-3 rounded-xl bg-[#F9FCFA] border border-[#D9E6DE] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#1B8B67] block">
                        {currentWeekDay.slice(0, 3)} • {slot.timeLabel}
                      </span>
                      <span className="font-bold text-[#14382C] text-xs line-clamp-1">{slot.subjectName}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#527568] bg-white px-2 py-0.5 rounded border border-[#D9E6DE]">
                      {slot.subjectCode}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* D. Official University Notices & Circulars */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#1B8B67]" />
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Official Notices
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
              {myNotices.length === 0 ? (
                <p className="text-xs text-[#6F8B7F] italic text-center py-4">No active notices.</p>
              ) : (
                myNotices.slice(0, 3).map(not => (
                  <div key={not.id} className="p-3 rounded-xl bg-[#F9FCFA] border border-[#D9E6DE] text-xs">
                    <span className="text-[9px] font-bold uppercase text-[#1B8B67] block">
                      {not.category} • {not.date}
                    </span>
                    <h4 className="font-bold text-[#14382C] mt-0.5 line-clamp-1">{not.title}</h4>
                    <p className="text-[11px] text-[#527568] mt-1 line-clamp-2">{not.content}</p>
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
          <span>Student Portal • National Institute of Technology</span>
        </div>
        <div className="italic text-[#3D6052] flex items-center gap-1">
          <span>"Good education is the foundation of a better tomorrow."</span>
          <span>🌱</span>
        </div>
      </footer>
    </div>
  );
};
