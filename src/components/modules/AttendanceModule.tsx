import React, { useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  Users,
  Trash2,
  X
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { StudentAttendanceStatus } from '../../types';

export const AttendanceModule: React.FC = () => {
  const { currentRole, currentUser, actualRole, isSimulatingRole } = useAuth();
  const {
    subjects,
    attendanceSessions,
    studentAttendance,
    markAttendance,
    deleteAttendanceSessionRecord,
    students,
    users
  } = useAcademicData();

  const isTeacherOrAdmin = currentRole === 'faculty' || currentRole === 'lab_assistant' || currentRole === 'hod' || currentRole === 'admin';

  // Year filter for academic attendance hierarchy
  const [selectedYear, setSelectedYear] = useState<number>(3); // 3rd Year (5th Semester)

  // State for attendance marking form
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState<string>('09:00 AM - 10:00 AM');
  const [section, setSection] = useState<string>('A');
  const [topicCovered, setTopicCovered] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'marking' | 'sessions' | 'studentView' | 'shortage'>(
    isTeacherOrAdmin ? 'marking' : 'studentView'
  );

  // Student roster for marking dynamically populated from Firestore
  const [roster, setRoster] = useState<StudentAttendanceStatus[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isRealStudent = actualRole === 'student';
  const isStudentView = currentRole === 'student';

  // Candidates for Breakdown & Shortage selection
  const enrolledStudentCandidates = students.length > 0
    ? students.map(s => ({ id: s.id, userId: s.userId, name: s.name, rollNumber: s.rollNumber || s.registrationNumber }))
    : users.filter(u => u.role === 'student').map(u => ({ id: u.id, userId: u.id, name: u.name, rollNumber: u.regId }));

  const [selectedStudentCandidateId, setSelectedStudentCandidateId] = useState<string>(
    isRealStudent ? currentUser.id : (enrolledStudentCandidates[0]?.id || '')
  );

  const activeStudentCandidate = isRealStudent
    ? { id: currentUser.id, userId: currentUser.id, name: currentUser.name, rollNumber: currentUser.regId }
    : enrolledStudentCandidates.find(
        s => s.id === selectedStudentCandidateId || s.userId === selectedStudentCandidateId
      ) || enrolledStudentCandidates[0] || null;

  // STRICT REAL USER ISOLATION:
  // - Real authenticated student: strictly their own attendance records
  // - Admin simulating student view: empty list (0 personal records)
  // - Faculty / HOD / Admin in management mode: selected candidate's records
  // We NEVER use insecure !s.studentId fallback.
  const displayedAttendance = isRealStudent
    ? studentAttendance.filter(s => Boolean(s.studentId) && (s.studentId === currentUser.id || s.studentId === currentUser.regId))
    : isStudentView
    ? []
    : (activeStudentCandidate
        ? studentAttendance.filter(s => Boolean(s.studentId) && (s.studentId === activeStudentCandidate.id || s.studentId === activeStudentCandidate.userId))
        : studentAttendance.filter(s => Boolean(s.studentId)));

  const currentSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

  // Keep selectedSubjectId valid if subjects list changes
  React.useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Dynamic automatic attendance roster generation from active Firestore students
  React.useEffect(() => {
    if (!currentSubject) {
      setRoster([]);
      return;
    }

    // Filter students belonging to this subject's department
    const matchingStudents = students.filter(s => {
      const matchDept =
        !currentSubject.department ||
        s.departmentName?.toLowerCase().includes(currentSubject.department.toLowerCase()) ||
        s.departmentId?.toLowerCase().includes(currentSubject.department.toLowerCase()) ||
        currentSubject.department.toLowerCase().includes(s.departmentName?.toLowerCase() || '');
      const matchSem = !currentSubject.semester || s.semester === currentSubject.semester || s.year === Math.ceil(currentSubject.semester / 2);
      const matchSection = !section || s.section === section;
      const matchStatus = s.status === 'active';
      return matchDept && matchSem && matchSection && matchStatus;
    });

    // Also include any users registered as active students matching the department
    const matchingUsers = users.filter(u => {
      if (u.role !== 'student' || u.status !== 'active') return false;
      const alreadyInStudents = matchingStudents.some(s => s.userId === u.id || s.email === u.email);
      if (alreadyInStudents) return false;
      const matchDept = !currentSubject.department || u.department.toLowerCase().includes(currentSubject.department.toLowerCase());
      const matchSection = !section || !u.section || u.section === section;
      return matchDept && matchSection;
    });

    const combinedRoster: StudentAttendanceStatus[] = [
      ...matchingStudents.map(s => ({
        studentId: s.id,
        studentName: s.name,
        usn: s.rollNumber || s.registrationNumber,
        status: 'present' as const
      })),
      ...matchingUsers.map(u => ({
        studentId: u.id,
        studentName: u.name,
        usn: u.regId,
        status: 'present' as const
      }))
    ];

    setRoster(combinedRoster);
  }, [selectedSubjectId, section, students, users, currentSubject]);

  const toggleStudentStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setRoster(prev =>
      prev.map(r => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const markAll = (status: 'present' | 'absent') => {
    setRoster(prev => prev.map(r => ({ ...r, status })));
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject) return;
    const presentCount = roster.filter(r => r.status === 'present').length;
    const absentCount = roster.filter(r => r.status === 'absent').length;

    markAttendance({
      subjectId: currentSubject.id,
      subjectCode: currentSubject.code,
      subjectName: currentSubject.name,
      facultyId: currentUser.id,
      date,
      slot,
      semester: currentSubject.semester,
      section,
      topicCovered: topicCovered || 'Regular Scheduled Lecture',
      totalStudents: roster.length,
      presentCount,
      absentCount,
      records: roster
    });

    setNotification(`Attendance successfully committed for ${currentSubject.code}! Present: ${presentCount}, Absent: ${absentCount}`);
    setTopicCovered('');
    setTimeout(() => setNotification(null), 4000);
  };

  const lowAttendanceStudents = displayedAttendance.filter(s => s.percentage < 75);

  return (
    <div className="space-y-5">
      {/* Official Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              <CalendarCheck className="w-4 h-4 text-[#4F46E5]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#0F172A]">Attendance Monitoring & Regulatory Eligibility</h1>
              <p className="text-[11px] text-slate-500">
                Statutory 75% minimum attendance enforcement under university academic ordinances
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center bg-[#F1F5F9] p-0.5 rounded-md border border-[#E2E8F0] gap-1 text-xs">
          {isTeacherOrAdmin && (
            <button
              onClick={() => setActiveTab('marking')}
              className={`px-3 py-1.5 rounded font-medium transition-all ${
                activeTab === 'marking'
                  ? 'bg-[#0F172A] text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Take Attendance
            </button>
          )}

          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'sessions'
                ? 'bg-[#0F172A] text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Session Registers ({attendanceSessions.length})
          </button>

          <button
            onClick={() => setActiveTab('studentView')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'studentView'
                ? 'bg-[#0F172A] text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Course Breakdown
          </button>

          <button
            onClick={() => setActiveTab('shortage')}
            className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'shortage'
                ? 'bg-[#DC2626] text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Shortage Roll ({lowAttendanceStudents.length})
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Attendance Hierarchy Year Filter Card */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Academic Year Hierarchy:</span>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { year: 1, label: '1st Year (Sem 1-2)' },
            { year: 2, label: '2nd Year (Sem 3-4)' },
            { year: 3, label: '3rd Year (Sem 5-6)' },
            { year: 4, label: '4th Year (Sem 7-8)' }
          ].map(y => (
            <button
              key={y.year}
              onClick={() => setSelectedYear(y.year)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                selectedYear === y.year
                  ? 'bg-[#4F46E5] text-white font-semibold'
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700 hover:bg-slate-100'
              }`}
            >
              {y.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Take Attendance Form (for Faculty / Lab / Admin) */}
      {activeTab === 'marking' && isTeacherOrAdmin && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-white">
            <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Lecture & Laboratory Attendance Roll Call
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select course code, verify timetable slot, and toggle student attendance status
            </p>
          </div>

          <form onSubmit={handleSaveAttendance} className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Course Code & Name</label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} ({s.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Session Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Class Timetable Slot</label>
                <select
                  value={slot}
                  onChange={e => setSlot(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM (Slot 1)</option>
                  <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM (Slot 2)</option>
                  <option value="11:15 AM - 12:15 PM">11:15 AM - 12:15 PM (Slot 3)</option>
                  <option value="01:30 PM - 04:30 PM">01:30 PM - 04:30 PM (Lab Slot)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Section / Cohort</label>
                <input
                  type="text"
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  placeholder="e.g. 5th Sem CSE A"
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Conducted Syllabus Topic / Practical Exercise
              </label>
              <input
                type="text"
                value={topicCovered}
                onChange={e => setTopicCovered(e.target.value)}
                placeholder="e.g. Unit 4: B+ Tree range queries and deletion rebalancing"
                className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>

            {/* Student Roster Table */}
            <div className="border border-[#E2E8F0] rounded-md overflow-hidden">
              <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">
                  Student Roster ({roster.length} Enrolled Candidates)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => markAll('present')}
                    className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAll('absent')}
                    className="text-[10px] font-semibold text-red-800 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {roster.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="font-semibold text-slate-700">No students registered for this class</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Active students matching this department and section will automatically populate on this roster.
                    </p>
                  </div>
                ) : (
                  roster.map(st => (
                    <div key={st.studentId} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{st.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{st.usn}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(st.studentId, 'present')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            st.status === 'present'
                              ? 'bg-[#10B981] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(st.studentId, 'absent')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            st.status === 'absent'
                              ? 'bg-[#DC2626] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(st.studentId, 'late')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            st.status === 'late'
                              ? 'bg-[#F59E0B] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Late
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={roster.length === 0}
                className={`px-4 py-2 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                  roster.length > 0
                    ? 'bg-[#0F172A] hover:bg-slate-800 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Commit Attendance Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Session Logs */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
            <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Recorded Attendance Session Registers
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Showing {attendanceSessions.length} sessions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Date & Slot</th>
                  <th className="py-2.5 px-3">Section / Batch</th>
                  <th className="py-2.5 px-3">Topic Conducted</th>
                  <th className="py-2.5 px-3 text-center">Present</th>
                  <th className="py-2.5 px-3 text-center">Absent</th>
                  <th className="py-2.5 px-3 text-center">Turnout</th>
                  {isTeacherOrAdmin && <th className="py-2.5 px-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceSessions.length === 0 ? (
                  <tr>
                    <td colSpan={isTeacherOrAdmin ? 8 : 7} className="py-8 text-center text-slate-500">
                      No attendance sessions recorded yet.
                    </td>
                  </tr>
                ) : (
                  attendanceSessions.map(sess => {
                    const turnout = sess.totalStudents > 0 ? Math.round((sess.presentCount / sess.totalStudents) * 100) : 0;
                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[10px] mr-1.5">
                            {sess.subjectCode}
                          </span>
                          {sess.subjectName}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {sess.date} <br />
                          <span className="text-[10px] text-slate-400">{sess.slot}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          Sem {sess.semester} - {sess.section} {sess.batch && `(${sess.batch})`}
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                          {sess.topicCovered}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-700">
                          {sess.presentCount}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-red-700">
                          {sess.absentCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            turnout >= 75 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {turnout}%
                          </span>
                        </td>
                        {isTeacherOrAdmin && (
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(sess.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Attendance Session Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Subject-wise Student View */}
      {activeTab === 'studentView' && (
        <div className="space-y-4">
          {isTeacherOrAdmin && enrolledStudentCandidates.length > 0 && (
            <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4F46E5]" />
                <span className="font-bold text-slate-800">Select Student Candidate:</span>
              </div>
              <select
                value={selectedStudentCandidateId}
                onChange={e => setSelectedStudentCandidateId(e.target.value)}
                className="text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 font-semibold focus:ring-1 focus:ring-[#4F46E5]"
              >
                {enrolledStudentCandidates.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.rollNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {displayedAttendance.length === 0 ? (
              <div className="col-span-2 bg-white rounded-lg border border-[#E2E8F0] p-12 text-center text-slate-500">
                <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">
                  {isSimulatingRole && isStudentView
                    ? 'Role Simulation Mode — No Personal Attendance'
                    : 'No attendance data available'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  {isSimulatingRole && isStudentView
                    ? 'Administrator preview session does not attach any student\'s personal attendance records. To inspect an individual student\'s attendance, navigate to Admin → Users & Students.'
                    : `There are no attendance records registered for ${activeStudentCandidate?.name || 'this candidate'} yet.`}
                </p>
              </div>
            ) : (
              displayedAttendance.map(item => {
                const isWarning = item.percentage < 75;
                return (
                  <div
                    key={item.subjectId}
                    className="bg-white p-4 rounded-lg border border-[#E2E8F0] hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-800">
                          {item.subjectCode}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 mt-1">{item.subjectName}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Faculty: {item.facultyName}</p>
                      </div>
                      <span
                        className={`text-lg font-bold font-mono ${
                          isWarning ? 'text-[#DC2626]' : 'text-emerald-700'
                        }`}
                      >
                        {item.percentage}%
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isWarning ? 'bg-[#DC2626]' : 'bg-[#10B981]'
                          }`}
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600">
                      <span>
                        Conducted: <strong className="text-slate-900">{item.totalClasses}</strong> | Attended:{' '}
                        <strong className="text-slate-900">{item.attendedClasses}</strong>
                      </span>
                      {isWarning ? (
                        <span className="text-red-700 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200 text-[10px]">
                          Shortage Alert
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Compliant
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Shortage Watchlist */}
      {activeTab === 'shortage' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                Official Low Attendance Watchlist (&lt;75% Cutoff)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Eligible for remedial sessions and parental advisory notification
              </p>
            </div>
            <button className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 border border-[#E2E8F0]">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Download Advisory Circular
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-[#E2E8F0] rounded-md overflow-hidden">
            {lowAttendanceStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No attendance shortages</p>
                <p className="text-xs text-slate-400 mt-0.5">All registered courses have attendance &ge; 75%.</p>
              </div>
            ) : (
              lowAttendanceStudents.map(st => (
                <div key={st.subjectId} className="p-3 bg-red-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800">
                        {st.subjectCode}
                      </span>
                      <h3 className="font-semibold text-slate-900">{st.subjectName}</h3>
                    </div>
                    <p className="text-slate-500 mt-0.5 text-[11px]">
                      Candidate: {activeStudentCandidate?.name || currentUser.name} ({activeStudentCandidate?.rollNumber || currentUser.regId || 'ID'}) • Attended: {st.attendedClasses}/{st.totalClasses} classes
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-[#DC2626]">{st.percentage}%</span>
                      <p className="text-[10px] text-red-700 font-semibold uppercase">Needs remedial sessions</p>
                    </div>
                    <button className="px-2.5 py-1 rounded-md bg-[#DC2626] hover:bg-red-700 text-white font-medium text-xs">
                      Issue Notice
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 max-w-md w-full shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-[#0F172A] mb-2">
              Delete Attendance Session
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Are you sure you want to permanently delete this attendance session? This will remove the recorded attendance register from the database.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleteConfirmId) {
                    await deleteAttendanceSessionRecord(deleteConfirmId);
                    setDeleteConfirmId(null);
                    setNotification('Attendance session successfully deleted.');
                    setTimeout(() => setNotification(null), 3500);
                  }
                }}
                className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
