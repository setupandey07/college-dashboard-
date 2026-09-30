import React from 'react';
import {
  Users,
  BookOpenCheck,
  CalendarCheck,
  Briefcase,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Building2,
  Plus
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';

interface HodDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const HodDashboard: React.FC<HodDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { subjects, workloads, queries, departments, users, students, attendanceSessions, sections } = useAcademicData();

  // Find department matching currentUser's department or default to first department
  const myDept = departments.find(
    d => d.code === currentUser.departmentCode ||
         (currentUser.department && d.name.toLowerCase().includes(currentUser.department.toLowerCase())) ||
         d.code === 'CSE'
  ) || departments[0] || null;

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

  const deptQueries = queries.filter(
    q => (!myDept || q.department === myDept.name || q.department === myDept.code) && q.status !== 'resolved'
  );

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

  return (
    <div className="space-y-6">
      {/* Official Department Banner */}
      <div className="bg-white rounded-lg p-5 sm:p-6 border border-[#E2E8F0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Head of Department (HOD) Terminal
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">{myDept?.name || 'Department Academic Management'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
              Department Academic Monitoring & Faculty Governance
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              Supervising {classCount} academic class section{classCount === 1 ? '' : 's'}, {facultyCount} departmental faculty member{facultyCount === 1 ? '' : 's'}, {myDept?.labsCount || 0} laboratory unit{myDept?.labsCount === 1 ? '' : 's'}, and {studentCount} registered student{studentCount === 1 ? '' : 's'} ({myDept?.code || 'Departmental'} Division).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => onNavigate('syllabus')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white transition-colors cursor-pointer"
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              Syllabus Audit
            </button>
            <button
              onClick={() => onNavigate('workload')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 transition-colors border border-[#E2E8F0] cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Workload Plan
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Clean 4-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Student Strength */}
        <div
          onClick={() => onNavigate('users')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Department Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{studentCount}</span>
            <span className="text-xs text-slate-500">Students</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {studentCount === 0 ? '0 students enrolled' : `${studentCount} verified active student accounts`}
          </p>
        </div>

        {/* Faculty Count */}
        <div
          onClick={() => onNavigate('workload')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Department Faculty</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{facultyCount}</span>
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${
                overloadedCount > 0
                  ? 'text-amber-800 bg-amber-50 border-amber-300'
                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}
            >
              {overloadedCount} Overload
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {facultyCount === 0 ? '0 faculty members registered' : `${deptWorkloads.length} teaching allocations tracked`}
          </p>
        </div>

        {/* Average Attendance */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Department Attendance</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
              {deptAttSessions.length > 0 ? `${avgDeptAttendance}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500">Dept average</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
            <span>{deptAttSessions.length > 0 ? `${deptAttSessions.length} session${deptAttSessions.length === 1 ? '' : 's'} recorded` : 'Pending session records'}</span>
          </div>
        </div>

        {/* Syllabus Coverage */}
        <div
          onClick={() => onNavigate('syllabus')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Syllabus Coverage</span>
            <BookOpenCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#4F46E5]">{avgSyllabusCoverage}%</span>
            <span className="text-xs text-slate-500">Curriculum audit</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {deptSubjects.length === 0 ? '0 subjects defined' : `${deptSubjects.length} courses tracked`}
          </p>
        </div>
      </div>

      {/* Main Section: Subject Syllabus Coverage & Faculty Load */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Progress Table */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-[#4F46E5]" />
                Department Course Syllabus Tracking
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lecture & laboratory topic completion audits
              </p>
            </div>
            <button
              onClick={() => onNavigate('syllabus')}
              className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Update Topics <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {deptSubjects.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <BookOpenCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No courses registered for this department yet.</p>
                <p className="text-slate-400 mt-1">Add course subjects in Syllabus Coverage to track unit completion.</p>
              </div>
            ) : (
              deptSubjects.map(sub => {
                const percentage = sub.totalHoursPlanned > 0
                  ? Math.round((sub.hoursConducted / sub.totalHoursPlanned) * 100)
                  : 0;
                const completedUnits = sub.units ? sub.units.filter(u => u.isCompleted).length : 0;
                const totalUnitsCount = sub.units?.length || 5;

                return (
                  <div key={sub.id} className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-200 text-slate-800">
                            {sub.code}
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900">{sub.name}</h3>
                          <span className="text-xs text-slate-500">
                            ({sub.credits} Credits)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Course Faculty: <span className="font-semibold text-slate-800">{sub.facultyName || 'Not Assigned'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-xs">
                        <span className="font-bold text-slate-900">
                          {sub.hoursConducted}/{sub.totalHoursPlanned} hrs ({percentage}%)
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {completedUnits}/{totalUnitsCount} Units Done
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage >= 75 ? 'bg-[#4F46E5]' : 'bg-[#F59E0B]'
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

        {/* Right Column: Faculty Workloads & Grievances */}
        <div className="space-y-5">
          {/* Workload Snapshot */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#4F46E5]" />
                Faculty Workload Allocations
              </h3>
              <button
                onClick={() => onNavigate('workload')}
                className="text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {deptWorkloads.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No workload records in this department.</p>
              ) : (
                deptWorkloads.slice(0, 4).map(f => (
                  <div key={f.facultyId} className="p-3 rounded-md border border-[#E2E8F0] bg-slate-50 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{f.facultyName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          f.status === 'overload'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {f.currentWeeklyHours} hrs/wk
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {f.designation} • {f.subjectsAssigned ? f.subjectsAssigned.length : 0} Courses Allocated
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Grievances */}
          <div className="bg-white p-5 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                Student Inquiries ({deptQueries.length})
              </h3>
              <button
                onClick={() => onNavigate('queries')}
                className="text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer"
              >
                Review
              </button>
            </div>

            <div className="space-y-2.5">
              {deptQueries.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No open queries in this department.</p>
              ) : (
                deptQueries.slice(0, 3).map(q => (
                  <div key={q.id} className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] font-bold text-slate-700">{q.ticketId}</span>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded uppercase">
                        {q.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-semibold truncate">{q.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Raised by {q.studentName} ({q.usn})
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
