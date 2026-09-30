import React from 'react';
import {
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
  DoorOpen,
  ShieldCheck
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';

interface StudentDashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAiAssistant: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigate
}) => {
  const { currentUser, actualRole, isSimulatingRole } = useAuth();
  const { subjects, studentAttendance, studentMarks, innovationProjects, queries, announcements, sections, departments } = useAcademicData();

  // Strict Real User Check: Real Student account vs Administrator role preview
  const isRealStudent = actualRole === 'student';

  // Student specific class section
  const studentDeptCode = isRealStudent
    ? (currentUser.departmentCode || 'CSE')
    : (departments[0]?.code || 'CSE');
  const studentDeptName = isRealStudent
    ? (currentUser.department || 'Academic Department')
    : (departments[0]?.name || 'Computer Science & Engineering');
  const studentSem = isRealStudent ? (currentUser.semester || 5) : 5;
  const studentSec = isRealStudent ? (currentUser.section || 'Section A') : 'Section A';

  // Filter subjects matching department, semester, and section for curriculum inspection
  const myClassSubjects = subjects.filter(s => {
    const deptMatch =
      !s.department ||
      s.department.toLowerCase() === studentDeptCode.toLowerCase() ||
      s.department.toLowerCase() === studentDeptName.toLowerCase();
    const semMatch = !s.semester || s.semester === studentSem;
    const secMatch = !s.section || s.section === 'All' || s.section === studentSec;
    return deptMatch && semMatch && secMatch;
  });

  // Filter section details
  const mySection = sections.find(
    s =>
      (s.departmentCode?.toLowerCase() === studentDeptCode.toLowerCase() ||
        s.departmentName?.toLowerCase() === studentDeptName.toLowerCase()) &&
      s.semester === studentSem &&
      (s.sectionName === studentSec || s.sectionName === `Section ${studentSec}`)
  );

  // STRICT REAL USER ISOLATION:
  // Personal assessment marks are ONLY fetched if this is the student's authenticated account.
  // Administrator testing simulation has 0 personal marks attached.
  const myMarks = isRealStudent
    ? studentMarks.filter(
        sm => Boolean(sm.studentId) && (sm.studentId === currentUser.id || sm.studentId === currentUser.regId)
      )
    : [];

  // STRICT REAL USER ISOLATION:
  // Attendance records are ONLY fetched if this is the student's authenticated account.
  // We NEVER use !a.studentId fallback.
  const myAttendance = isRealStudent
    ? studentAttendance.filter(
        a => Boolean(a.studentId) && (a.studentId === currentUser.id || a.studentId === currentUser.regId)
      )
    : [];

  const totalClasses = myAttendance.reduce((acc, a) => acc + a.totalClasses, 0);
  const totalAttended = myAttendance.reduce((acc, a) => acc + a.attendedClasses, 0);
  const overallPercentage = totalClasses > 0
    ? Number(((totalAttended / totalClasses) * 100).toFixed(1))
    : 0;

  // Low attendance subjects (< 75%)
  const shortageSubjects = myAttendance.filter(a => a.percentage < 75);

  // Projected performance from real internal marks
  const averageInternalScore = myMarks.length > 0
    ? (myMarks.reduce((sum, s) => sum + s.totalInternal, 0) / myMarks.length).toFixed(1)
    : null;

  // Filter innovation projects strictly for current real user
  const myProjects = isRealStudent
    ? innovationProjects.filter(
        p => (p.leadStudent && p.leadStudent.toLowerCase().includes(currentUser.name.toLowerCase())) ||
             (p.teamMembers && p.teamMembers.some(m => m.toLowerCase().includes(currentUser.name.toLowerCase())))
      )
    : [];

  // Filter announcements for student's department/all
  const myNotices = announcements.filter(
    a =>
      a.targetAudience === 'all' ||
      a.targetAudience === 'students' ||
      (a.department && a.department.toLowerCase() === studentDeptCode.toLowerCase())
  );

  // Timetable slot mock generation based on real enrolled subjects
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const timeSlots = ['09:00 - 10:00', '10:00 - 11:00', '11:15 - 12:15', '14:00 - 15:00', '15:00 - 16:00'];

  return (
    <div className="space-y-6">
      {/* Role Preview Banner for Administrator Testing */}
      {isSimulatingRole && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-900 font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Role Simulation Mode — Student Portal Interface</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            You are previewing the Student interface layout, navigation, and curriculum as Administrator (<strong className="text-slate-900">{currentUser.name}</strong>).
            Personal student records (marks, attendance logs, USN) are strictly isolated to authenticated student accounts and are <strong>not loaded into this administrator preview</strong>.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[11px] text-amber-800 font-medium">To inspect a student's personal records:</span>
            <button
              onClick={() => onNavigate('users')}
              className="px-2.5 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            >
              Open Users & Students Directory
            </button>
          </div>
        </div>
      )}

      {/* Official Student Banner */}
      <div className="bg-white rounded-lg p-5 sm:p-6 border border-[#E2E8F0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {studentDeptCode} • Semester {studentSem} • {studentSec}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-semibold">{studentDeptName}</span>
              {isSimulatingRole && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                  Testing Simulation
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
              Undergraduate Academic Progress Terminal
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              {isRealStudent ? (
                <>
                  Enrolled Student: <strong className="text-slate-900">{currentUser.name}</strong> • Roll No / USN: <strong className="font-mono text-slate-900">{currentUser.regId}</strong> • {mySection?.roomNumber ? `Classroom: ${mySection.roomNumber}` : `Section ${studentSec}`}.
                </>
              ) : (
                <>
                  Role Simulator View (Administrator: <strong className="text-slate-900">{currentUser.name}</strong>) • Roll No / USN: <span className="font-mono text-slate-500 italic">Not Applicable (Preview Mode)</span> • Curriculum: <strong className="text-slate-900">{studentDeptCode} Semester {studentSem}</strong>.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => onNavigate('queries')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              Raise Inquiry
            </button>
            <button
              onClick={() => onNavigate('innovation')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 transition-colors border border-[#E2E8F0] cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
              Innovation Proposal
            </button>
          </div>
        </div>
      </div>

      {/* Shortage Alert Banner if any subject < 75% */}
      {shortageSubjects.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <h3 className="font-bold text-red-900">
              Statutory Attendance Shortage Warning ({shortageSubjects.length} Course{shortageSubjects.length === 1 ? '' : 's'} Below 75% Threshold)
            </h3>
            <p className="text-red-700 mt-1 text-xs leading-relaxed">
              University regulations require a minimum 75% aggregate attendance to remain eligible for End-Semester examinations.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {shortageSubjects.map(s => {
                const requiredClasses = Math.ceil((0.75 * s.totalClasses - s.attendedClasses) / (1 - 0.75));
                return (
                  <span
                    key={s.subjectId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-red-800 font-semibold border border-red-300 text-xs"
                  >
                    {s.subjectCode}: {s.percentage}% ({s.attendedClasses}/{s.totalClasses}) — Attend next {Math.max(1, requiredClasses)} classes
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Attendance */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Aggregate Attendance</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-bold ${
                totalClasses === 0 ? 'text-[#0F172A]' : overallPercentage >= 75 ? 'text-[#0F172A]' : 'text-[#DC2626]'
              }`}
            >
              {totalClasses > 0 ? `${overallPercentage}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500">{totalAttended}/{totalClasses} slots</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {isSimulatingRole
              ? 'Role simulator — 0 personal logs'
              : totalClasses === 0
              ? 'No attendance sessions logged'
              : overallPercentage >= 75
              ? 'Eligible for examinations'
              : 'Shortage warning active'}
          </p>
        </div>

        {/* Projected CIA Performance */}
        <div
          onClick={() => onNavigate('marks')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Internal Marks Average</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
              {averageInternalScore !== null ? `${averageInternalScore}/50` : 'N/A'}
            </span>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                averageInternalScore && Number(averageInternalScore) >= 35
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {averageInternalScore && Number(averageInternalScore) >= 40 ? "Grade 'A+'" : averageInternalScore ? "Grade 'B+'" : 'Pending'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {isSimulatingRole
              ? 'Role simulator — 0 assessment marks'
              : myMarks.length === 0
              ? 'No assessment records recorded'
              : `Based on ${myMarks.length} course assessments`}
          </p>
        </div>

        {/* Enrolled Class Subjects */}
        <div
          onClick={() => onNavigate('syllabus')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Enrolled Subjects</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{myClassSubjects.length}</span>
            <span className="text-xs text-slate-500">Courses</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {studentDeptCode} Semester {studentSem} • {studentSec}
          </p>
        </div>

        {/* R&D Innovation */}
        <div
          onClick={() => onNavigate('innovation')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">R&D Projects</span>
            <Lightbulb className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#4F46E5]">{myProjects.length}</span>
            <span className="text-xs text-slate-500 font-medium">Proposals</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate">
            {myProjects.length === 0
              ? 'No active research proposals'
              : myProjects[0].title}
          </p>
        </div>
      </div>

      {/* Main Grid: Enrolled Subjects & Timetable Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrolled Classroom Subjects Roster (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                Class Curriculum & Assigned Faculty ({studentDeptCode} Sem {studentSem} {studentSec})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official syllabus, instructor assignments, and unit progress for your class
              </p>
            </div>
            <button
              onClick={() => onNavigate('syllabus')}
              className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Syllabus Builder <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {myClassSubjects.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No subjects assigned to {studentDeptCode} Semester {studentSem} {studentSec} yet.</p>
                <p className="text-slate-400 mt-1 max-w-md mx-auto">
                  When Admin or HOD creates subjects for your department and semester, they will appear here automatically.
                </p>
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

                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-200 rounded text-slate-800">
                            {sub.code}
                          </span>
                          <h3 className="font-bold text-slate-900 mt-1 text-xs line-clamp-1">{sub.name}</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">Faculty: {sub.facultyName || 'Instructor'}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-[#4F46E5] border border-indigo-200">
                          {sub.credits} Credits
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span>Syllabus Coverage</span>
                          <span className="font-bold text-slate-900">{coverage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#4F46E5] h-full rounded-full transition-all"
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

        {/* Right Sidebar: Classroom Timetable & Notices */}
        <div className="space-y-5">
          {/* Classroom Timetable Widget */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Weekly Class Timetable
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Sem {studentSem}
              </span>
            </div>

            {myClassSubjects.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Timetable will generate automatically when courses are created.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {myClassSubjects.slice(0, 4).map((sub, idx) => (
                  <div key={sub.id} className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 block">{days[idx % days.length]} • {timeSlots[idx % timeSlots.length]}</span>
                      <span className="font-bold text-slate-900 text-xs">{sub.name} ({sub.code})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {sub.type.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Notices */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-amber-500" />
                Department Circulars
              </h3>
              <button
                onClick={() => onNavigate('announcements')}
                className="text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer"
              >
                All Notices
              </button>
            </div>

            {myNotices.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No circulars posted for your department.</p>
            ) : (
              <div className="space-y-2.5">
                {myNotices.slice(0, 3).map(not => (
                  <div key={not.id} className="p-2.5 rounded bg-amber-50/50 border border-amber-200/60 text-xs">
                    <span className="text-[10px] font-bold uppercase text-amber-800 block">{not.category} • {not.date}</span>
                    <h4 className="font-bold text-slate-900 mt-0.5 line-clamp-1">{not.title}</h4>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{not.content}</p>
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
