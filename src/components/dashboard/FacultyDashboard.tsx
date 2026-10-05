import React from 'react';
import {
  CalendarCheck,
  BookOpenCheck,
  Award,
  Clock,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ArrowUpRight,
  ChevronRight,
  Users,
  ShieldCheck,
  Calendar,
  Send,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';
import { filterQueriesForUser } from '../../lib/queryPrivacy';
import { TimetableDay, DEFAULT_TIMETABLE_SLOTS } from '../../services/firestore';
import {
  CampusHeroIllustration,
  SmartTechBooksIllustration,
  AcademicExcellenceIllustration
} from '../common/AcademicIllustrations';
import { MetricValueSkeleton } from '../common/LoadingSkeleton';

interface FacultyDashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAiAssistant: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({
  onNavigate,
  onOpenAiAssistant
}) => {
  const { currentUser, actualRole, isSimulatingRole } = useAuth();
  const {
    subjects,
    queries,
    attendanceSessions,
    announcements,
    timetables,
    loadingState,
    errorState
  } = useAcademicData();

  const isRealFaculty = actualRole === 'faculty';

  // Strict User Isolation: Filter subjects assigned to current user with strict department isolation
  const userAssignedIds = currentUser.assignedSubjectIds || (currentUser.assignedSubjectId ? [currentUser.assignedSubjectId] : []);
  const userDeptCode = (currentUser.departmentCode || '').toUpperCase();
  const userDeptName = (currentUser.department || '').toLowerCase();

  const mySubjects = subjects.filter(s => {
    // 1. Department isolation
    if (userDeptCode && s.departmentCode && s.departmentCode.toUpperCase() !== userDeptCode) {
      return false;
    }
    if (userDeptName && s.department && s.department.toLowerCase() !== userDeptName && !s.departmentCode) {
      return false;
    }

    // 2. Explicit assigned IDs
    if (userAssignedIds.length > 0) {
      return userAssignedIds.includes(s.id);
    }

    // 3. Fallback to facultyId or facultyName match only if assignedSubjectIds not defined
    if (s.facultyId === currentUser.id) return true;
    if (s.facultyName && currentUser.name && (
      s.facultyName.toLowerCase().includes(currentUser.name.toLowerCase()) ||
      currentUser.name.toLowerCase().includes(s.facultyName.toLowerCase())
    )) {
      return true;
    }

    return false;
  });

  const activeSubjects = mySubjects;

  const myQueries = filterQueriesForUser(queries, currentUser, 'faculty');
  const pendingQueriesCount = myQueries.filter(q => q.status !== 'resolved').length;

  const theoryCount = activeSubjects.filter(s => s.type === 'theory').length;
  const labCount = activeSubjects.filter(s => s.type === 'lab').length;

  // Calculate actual weekly contact hours from assigned subjects
  const totalContactHours = activeSubjects.reduce(
    (acc, s) => acc + (s.type === 'lab' ? 3 : (s.credits ? Math.max(3, s.credits) : 3)),
    0
  );

  // Canonical Database Timetable Integration: Synchronize strictly with Firestore timetables
  const dayNames: TimetableDay[] = ['Monday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Monday'];
  const todayDayIndex = new Date().getDay();
  const currentWeekDay: TimetableDay = dayNames[todayDayIndex] || 'Monday';

  const databaseSlots: {
    id: string;
    subjectCode: string;
    subjectName: string;
    slot: string;
    room: string;
    section: string;
    status: 'conducted' | 'upcoming';
  }[] = [];

  timetables.forEach((tt) => {
    const daySchedule = tt.schedule?.[currentWeekDay];
    if (!daySchedule) return;

    Object.entries(daySchedule).forEach(([slotId, cell]) => {
      if (!cell) return;

      const isMyCell =
        (cell.facultyId && cell.facultyId === currentUser.id) ||
        (cell.facultyName && currentUser.name && cell.facultyName.toLowerCase() === currentUser.name.toLowerCase()) ||
        activeSubjects.some(s => s.id === cell.subjectId || s.code === cell.subjectCode);

      if (isMyCell) {
        const slotConfig = (tt.slotsConfig || DEFAULT_TIMETABLE_SLOTS).find(s => s.id === slotId);
        const timeLabel = slotConfig ? `${slotConfig.timeRange} (${slotConfig.label})` : slotId;

        // Check if attendance session was already recorded for this subject today
        const todayDateStr = new Date().toISOString().split('T')[0];
        const isConducted = attendanceSessions.some(
          sess =>
            (sess.subjectId === cell.subjectId || sess.subjectCode === cell.subjectCode) &&
            sess.date === todayDateStr
        );

        databaseSlots.push({
          id: `tt-${tt.sectionId}-${slotId}`,
          subjectCode: cell.subjectCode,
          subjectName: cell.subjectName,
          slot: timeLabel,
          room: cell.roomNumber || cell.room || 'Lecture Hall',
          section: `${tt.departmentCode} Yr ${tt.academicYear} - Sec ${tt.sectionName}`,
          status: isConducted ? 'conducted' : 'upcoming'
        });
      }
    });
  });

  const todaySchedule = databaseSlots;

  // Average attendance from real sessions
  const facultySessions = attendanceSessions.filter(
    sess => activeSubjects.some(s => s.id === sess.subjectId || s.code === sess.subjectCode)
  );
  const avgAttendancePct = facultySessions.length > 0
    ? Math.round(
        facultySessions.reduce((acc, s) => acc + (s.totalStudents > 0 ? (s.presentCount / s.totalStudents) * 100 : 0), 0) / facultySessions.length
      )
    : 0;

  // Faculty circulars
  const facultyAnnouncements = announcements.filter(
    a => a.targetAudience === 'all' || a.targetAudience === 'faculty'
  );

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userDisplayName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Professor';

  return (
    <div className="space-y-6">
      {/* Role Preview Banner for Administrator Testing */}
      {isSimulatingRole && (
        <div className="bg-[#FEF3C7] border border-[#F59E0B]/40 rounded-2xl p-4 text-xs animate-in fade-in flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[#92400E]">
            <ShieldCheck className="w-5 h-5 text-[#D97706] shrink-0" />
            <div>
              <p className="font-bold">Role Simulation Mode — Faculty Teaching Workspace</p>
              <p className="text-[11px] text-[#B45309]">
                Previewing teaching dashboard and evaluations as Administrator ({currentUser.name}).
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('users')}
            className="px-3 py-1.5 rounded-xl bg-[#0E2920] text-white font-bold text-xs hover:bg-[#14382C] shrink-0 transition-colors"
          >
            Manage Faculty Accounts
          </button>
        </div>
      )}

      {/* 1. Official Faculty Teaching Banner */}
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
              {currentUser.department || 'Engineering Faculty'}
            </span>
            <span className="text-xs text-[#527568] font-medium">•</span>
            <span className="text-xs text-[#527568] font-medium">Teaching & Evaluation Workbench</span>
          </div>
          <p className="text-[#4D6D61] text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            {isRealFaculty ? (
              <>
                {currentUser.name} ({currentUser.designation || 'Faculty'}) • {totalContactHours} Contact Hours/Week • {activeSubjects.length} Allocated Course Module{activeSubjects.length === 1 ? '' : 's'}.
              </>
            ) : (
              <>
                Curriculum preview with {activeSubjects.length} courses allocated. Conduct attendance and grade CIA assessments seamlessly.
              </>
            )}
          </p>
        </div>

        {/* Right Tagline & Illustration */}
        <div className="relative flex items-center justify-end gap-6 shrink-0 z-10">
          <div className="hidden lg:block text-right">
            <span className="font-serif italic text-lg text-[#2E7D60] font-bold block leading-none">
              Teach
            </span>
            <span className="font-serif italic text-xl text-[#1E5D47] font-extrabold block leading-tight">
              Inspire
            </span>
            <span className="font-serif italic text-2xl text-[#164837] font-black block leading-none">
              Elevate
            </span>
          </div>
          <div className="w-44 sm:w-56 h-28 sm:h-32 flex items-center justify-center">
            <CampusHeroIllustration className="w-full h-full object-contain drop-shadow-sm" />
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Row (4 cards matching Admin quality) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Allocated Courses */}
        <div
          onClick={() => onNavigate('syllabus')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpenCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Allocated Courses</p>
              <MetricValueSkeleton
                isLoading={loadingState.subjects}
                error={errorState.subjects}
                value={activeSubjects.length}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {theoryCount} Theory + {labCount} Lab
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 2: Weekly Contact Hours */}
        <div
          onClick={() => onNavigate('workload')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Weekly Contact Hours</p>
              <MetricValueSkeleton
                isLoading={loadingState.subjects}
                error={errorState.subjects}
                value={totalContactHours}
                unit=" hrs"
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {totalContactHours > 18 ? 'Workload Overload' : 'AICTE Optimal (16-18h)'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 3: Class Attendance Average */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Class Attendance</p>
              <MetricValueSkeleton
                isLoading={loadingState.attendance}
                error={errorState.attendance}
                value={facultySessions.length > 0 ? avgAttendancePct : 0}
                unit="%"
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {facultySessions.length} session{facultySessions.length === 1 ? '' : 's'} recorded
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 4: Student Inquiries */}
        <div
          onClick={() => onNavigate('queries')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Student Queries</p>
              <MetricValueSkeleton
                isLoading={loadingState.queries}
                error={errorState.queries}
                value={myQueries.length}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {pendingQueriesCount} Pending resolution
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
          {/* A. Today's Academic Schedule */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1B8B67]" />
                <h2 className="text-sm font-bold text-[#14382C]">Today's Academic Teaching Schedule</h2>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                Full Attendance Registry
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {loadingState.subjects ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-xl border border-[#D9E6DE] bg-[#F9FCFA] animate-pulse">
                      <div className="h-4 w-44 bg-[#E0ECE5] rounded" />
                      <div className="h-3 w-64 bg-[#E0ECE5] rounded mt-2" />
                    </div>
                  ))}
                </div>
              ) : todaySchedule.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6F8B7F]">
                  <p className="font-semibold text-[#14382C]">No classes scheduled for today.</p>
                  <p className="mt-1">Courses assigned to you will populate your daily teaching timetable automatically.</p>
                </div>
              ) : (
                todaySchedule.map(slot => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-xl border border-[#D9E6DE] bg-[#F9FCFA] hover:border-[#1B8B67] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#14382C] bg-[#EBF3EE] px-2 py-0.5 rounded border border-[#D9E6DE] text-[11px]">
                          {slot.subjectCode}
                        </span>
                        <h3 className="font-bold text-[#14382C] text-sm">{slot.subjectName}</h3>
                      </div>
                      <p className="text-[#527568] mt-1 text-[11px]">
                        {slot.slot} • {slot.room} • {slot.section}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          slot.status === 'conducted'
                            ? 'bg-[#EAF5EF] text-[#166E52] border border-[#CDE5D7]'
                            : 'bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]'
                        }`}
                      >
                        ● {slot.status}
                      </span>
                      <button
                        onClick={() => onNavigate('attendance')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1B8B67] hover:bg-[#167557] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer active:scale-95"
                      >
                        Take Attendance
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* B. Assigned Courses Syllabus Adherence */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-[#1B8B67]" />
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Course Syllabus Completion
                </h3>
              </div>
              <button
                onClick={() => onNavigate('syllabus')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                Update Units
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {activeSubjects.length === 0 ? (
                <p className="text-xs text-[#6F8B7F] italic text-center py-4">No subjects assigned yet.</p>
              ) : (
                activeSubjects.slice(0, 4).map(sub => {
                  const pct = sub.totalHoursPlanned > 0
                    ? Math.min(100, Math.round((sub.hoursConducted / sub.totalHoursPlanned) * 100))
                    : 0;

                  return (
                    <div key={sub.id} className="p-3.5 rounded-xl bg-[#F9FCFA] border border-[#D9E6DE] text-xs">
                      <div className="flex items-center justify-between font-bold text-[#14382C] mb-1.5">
                        <span className="truncate max-w-[220px]">{sub.code}: {sub.name}</span>
                        <span className="text-[#1B8B67] font-mono">{pct}%</span>
                      </div>
                      <div className="w-full bg-[#E2ECE6] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1B8B67] h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#527568]">
                        <span>{sub.hoursConducted} / {sub.totalHoursPlanned} Contact Hours</span>
                        <span className="capitalize font-medium">{sub.status?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* C. Teaching Assistant & AI Copilot Banner */}
          <div className="bg-gradient-to-r from-[#EBF5EF] to-[#DEF0E5] border border-[#CBE2D4] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#14382C]">
                  Academic Copilot & Lesson Planning Assistant
                </h3>
                <p className="text-xs text-[#3D6052] font-medium mt-0.5">
                  Generate course plans • Formulate CIA question rubrics • Summarize student query themes
                </p>
                <button
                  onClick={onOpenAiAssistant}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1B8B67] hover:bg-[#167557] transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch AI Copilot</span>
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
            <h3 className="text-sm font-bold text-[#14382C]">Faculty Academic Excellence</h3>
            <p className="text-xs text-[#527568] mt-0.5">
              Empowering next-generation engineers.
            </p>
          </div>

          {/* B. Faculty Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#1B8B67]" />
              Faculty Actions
            </h3>

            <div className="space-y-2">
              {/* 1. Primary Mint Button */}
              <button
                onClick={() => onNavigate('attendance')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1B8B67] to-[#167557] hover:from-[#167557] hover:to-[#125D45] text-white flex items-center justify-between font-bold text-xs shadow-xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-200" />
                  <span>Mark Class Attendance</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 2. Enter Marks */}
              <button
                onClick={() => onNavigate('marks')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-[#1B8B67]" />
                  <span>CIA Assessment Marks Entry</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 3. Master Notes */}
              <button
                onClick={() => onNavigate('notes')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#1B8B67]" />
                  <span>Upload Master Notes</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 4. Student Queries */}
              <button
                onClick={() => onNavigate('queries')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[#1B8B67]" />
                  <span>Respond to Student Queries</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* C. Recent Senate Circulars & Department Notices */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1B8B67]" />
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Academic Circulars
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
              {facultyAnnouncements.length === 0 ? (
                <p className="text-xs text-[#6F8B7F] italic text-center py-4">No active circulars.</p>
              ) : (
                facultyAnnouncements.slice(0, 3).map(item => (
                  <div key={item.id} className="p-3 rounded-xl bg-[#F9FCFA] border border-[#D9E6DE] text-xs">
                    <span className="text-[9px] font-bold uppercase text-[#1B8B67] block">
                      {item.category} • {item.date}
                    </span>
                    <p className="font-bold text-[#14382C] mt-0.5 line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-[#527568] mt-1 line-clamp-2">{item.content}</p>
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
          <span>Faculty Portal • National Institute of Technology</span>
        </div>
        <div className="italic text-[#3D6052] flex items-center gap-1">
          <span>"Good education is the foundation of a better tomorrow."</span>
          <span>🌱</span>
        </div>
      </footer>
    </div>
  );
};
