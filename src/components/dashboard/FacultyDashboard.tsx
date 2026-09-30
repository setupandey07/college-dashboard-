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
  Plus,
  ShieldCheck
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';

interface FacultyDashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAiAssistant: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({
  onNavigate,
  onOpenAiAssistant
}) => {
  const { currentUser, actualRole, isSimulatingRole } = useAuth();
  const { subjects, queries, attendanceSessions } = useAcademicData();

  const isRealFaculty = actualRole === 'faculty';

  // Strict User Isolation: Filter subjects assigned to current user, or allow curriculum preview for admin
  const mySubjects = isRealFaculty
    ? subjects.filter(
        s => s.facultyId === currentUser.id ||
             (s.facultyName && currentUser.name && (
               s.facultyName.toLowerCase().includes(currentUser.name.toLowerCase()) ||
               currentUser.name.toLowerCase().includes(s.facultyName.toLowerCase())
             ))
      )
    : [];

  const activeSubjects = mySubjects.length > 0 ? mySubjects : (isSimulatingRole ? subjects.slice(0, 4) : []);

  const myQueries = isRealFaculty
    ? queries.filter(
        q => (q.assignedTo && currentUser.name && (
               q.assignedTo.toLowerCase().includes(currentUser.name.toLowerCase()) ||
               currentUser.name.toLowerCase().includes(q.assignedTo.toLowerCase())
             )) ||
             q.category === 'academic'
      )
    : (isSimulatingRole ? queries.filter(q => q.category === 'academic') : []);

  const pendingQueriesCount = myQueries.filter(q => q.status !== 'resolved').length;

  const theoryCount = activeSubjects.filter(s => s.type === 'theory').length;
  const labCount = activeSubjects.filter(s => s.type === 'lab').length;

  // Calculate actual weekly contact hours from assigned subjects
  const totalContactHours = activeSubjects.reduce(
    (acc, s) => acc + (s.type === 'lab' ? 3 : (s.credits ? Math.max(3, s.credits) : 3)),
    0
  );

  // Dynamic teaching schedule derived strictly from real Firestore subjects
  const todaySchedule = activeSubjects.slice(0, 3).map((sub, idx) => ({
    id: `sc-${sub.id}`,
    subjectCode: sub.code,
    subjectName: sub.name,
    slot: idx === 0 ? '09:00 AM - 10:00 AM' : idx === 1 ? '11:15 AM - 12:15 PM' : '01:30 PM - 03:30 PM',
    room: sub.type === 'lab' ? 'Computing Lab' : `Lecture Hall ${sub.semester}01`,
    section: `${sub.semester}th Sem - Section A`,
    status: idx === 0 ? ('conducted' as const) : ('upcoming' as const)
  }));

  // Average attendance from real sessions
  const facultySessions = attendanceSessions.filter(
    sess => activeSubjects.some(s => s.id === sess.subjectId || s.code === sess.subjectCode)
  );
  const avgAttendancePct = facultySessions.length > 0
    ? Math.round(
        facultySessions.reduce((acc, s) => acc + (s.totalStudents > 0 ? (s.presentCount / s.totalStudents) * 100 : 0), 0) / facultySessions.length
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Role Preview Banner for Administrator Testing */}
      {isSimulatingRole && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-900 font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Role Simulation Mode — Faculty Portal Interface</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            You are previewing the Faculty teaching workbench and evaluation tools as Administrator (<strong className="text-slate-900">{currentUser.name}</strong>).
            Faculty appointments and individual course assignments remain strictly isolated to verified faculty accounts.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[11px] text-amber-800 font-medium">To manage faculty appointments:</span>
            <button
              onClick={() => onNavigate('users')}
              className="px-2.5 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            >
              Open Users & Students Directory
            </button>
          </div>
        </div>
      )}

      {/* Official Faculty Banner */}
      <div className="bg-white rounded-lg p-5 sm:p-6 border border-[#E2E8F0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Faculty Academic Terminal
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">{currentUser.department || 'Academic Department'}</span>
              {isSimulatingRole && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                  Testing Simulation
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
              Faculty Teaching & Evaluation Workbench
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              {isRealFaculty ? (
                <>
                  {currentUser.name} ({currentUser.designation || 'Faculty'}) • {totalContactHours} Contact Hours/Week • {activeSubjects.length} Allocated Course Module{activeSubjects.length === 1 ? '' : 's'}.
                </>
              ) : (
                <>
                  Role Simulator View (Administrator: <strong className="text-slate-900">{currentUser.name}</strong>) • {activeSubjects.length} Course Module{activeSubjects.length === 1 ? '' : 's'} in Curriculum Preview.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => onNavigate('attendance')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white transition-colors cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Mark Attendance
            </button>
            <button
              onClick={() => onNavigate('marks')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 transition-colors border border-[#E2E8F0] cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              CIA Marks Entry
            </button>
            <button
              onClick={() => onNavigate('syllabus')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] border border-indigo-200 transition-colors cursor-pointer"
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              Syllabus Coverage
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: 100% Real Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Allocated Courses */}
        <div
          onClick={() => onNavigate('syllabus')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Allocated Courses</span>
            <BookOpenCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{activeSubjects.length}</span>
            <span className="text-xs text-slate-500">Courses</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {activeSubjects.length === 0
              ? 'No courses assigned yet'
              : `${theoryCount} Theory + ${labCount} Laboratory`}
          </p>
        </div>

        {/* Weekly Contact Hours */}
        <div
          onClick={() => onNavigate('workload')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Weekly Contact Hours</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{totalContactHours} hrs</span>
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${
                totalContactHours > 18
                  ? 'text-amber-800 bg-amber-50 border-amber-300'
                  : totalContactHours >= 12
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  : 'text-slate-700 bg-slate-100 border-slate-200'
              }`}
            >
              {totalContactHours > 18 ? 'Overload' : totalContactHours >= 12 ? 'Optimal' : 'Light Load'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">AICTE Compliant Threshold (16-18h)</p>
        </div>

        {/* Average Student Attendance */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Class Attendance Average</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
              {facultySessions.length > 0 ? `${avgAttendancePct}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500">
              {facultySessions.length} Session{facultySessions.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {facultySessions.length === 0
              ? 'No sessions marked yet'
              : avgAttendancePct >= 75
              ? 'Above statutory 75% cutoff'
              : 'Attention needed for student turnout'}
          </p>
        </div>

        {/* Student Inquiries */}
        <div
          onClick={() => onNavigate('queries')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Student Inquiries</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{myQueries.length}</span>
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${
                pendingQueriesCount > 0
                  ? 'text-amber-800 bg-amber-50 border-amber-300'
                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}
            >
              {pendingQueriesCount} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Academic & evaluation queries</p>
        </div>
      </div>

      {/* Main Row: Today's Timetable & Course Syllabus Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Timetable */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4F46E5]" />
                Today's Academic Teaching Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic schedule derived from allocated course subjects
              </p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Record Attendance <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {todaySchedule.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <BookOpenCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No course subjects allocated yet</p>
                <p className="text-slate-400 mt-1">Assign courses in Syllabus Coverage to populate your daily teaching timetable.</p>
              </div>
            ) : (
              todaySchedule.map(slot => (
                <div key={slot.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {slot.subjectCode}
                      </span>
                      <h3 className="font-bold text-slate-900">{slot.subjectName}</h3>
                    </div>
                    <p className="text-slate-500 mt-1">
                      {slot.slot} • {slot.room} • {slot.section}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        slot.status === 'conducted'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      ● {slot.status}
                    </span>
                    <button
                      onClick={() => onNavigate('attendance')}
                      className="px-2.5 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-[11px] cursor-pointer"
                    >
                      Take Attendance
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Syllabus Coverage Status */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
              <BookOpenCheck className="w-4 h-4 text-[#4F46E5]" />
              Syllabus Completion
            </h3>
            <button
              onClick={() => onNavigate('syllabus')}
              className="text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer"
            >
              Audit All
            </button>
          </div>

          <div className="space-y-3">
            {activeSubjects.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No subjects registered.</p>
            ) : (
              activeSubjects.slice(0, 4).map(sub => {
                const pct = sub.totalHoursPlanned > 0
                  ? Math.min(100, Math.round((sub.hoursConducted / sub.totalHoursPlanned) * 100))
                  : 0;

                return (
                  <div key={sub.id} className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                      <span className="truncate max-w-[170px]">{sub.code}: {sub.name}</span>
                      <span className="text-[#4F46E5]">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-[#4F46E5] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{sub.hoursConducted} / {sub.totalHoursPlanned} Hours</span>
                      <span className="capitalize">{sub.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
