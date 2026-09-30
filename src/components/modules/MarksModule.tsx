import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  Trash2,
  AlertTriangle,
  UserCheck,
  Search,
  Filter
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { StudentMarksEntry } from '../../types';

export const MarksModule: React.FC = () => {
  const { currentRole, currentUser, actualRole, isSimulatingRole } = useAuth();
  const {
    subjects,
    assessments,
    studentMarks,
    recordAssessmentMarks,
    deleteAssessmentRecord,
    purgeAllDemoData,
    students,
    users
  } = useAcademicData();

  const isTeacherOrAdmin = currentRole === 'faculty' || currentRole === 'lab_assistant' || currentRole === 'hod' || currentRole === 'admin';
  const isStudent = currentRole === 'student';
  const isRealStudent = actualRole === 'student';

  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'studentMarksheet'>(
    isTeacherOrAdmin ? 'entry' : 'studentMarksheet'
  );

  // Form state for marks entry
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [assessmentType, setAssessmentType] = useState<'CIA-1' | 'CIA-2' | 'Model Exam' | 'Practical / Viva' | 'Assignment'>('CIA-2');
  const [maxMarks, setMaxMarks] = useState<number>(50);
  const [section, setSection] = useState<string>('A');
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Students roster for marks entry populated dynamically from Firestore
  const [marksEntries, setMarksEntries] = useState<StudentMarksEntry[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);

  // Enrolled students roster for marksheets (deduplicated by userId / regId)
  const enrolledStudents = React.useMemo(() => {
    const list: Array<{ id: string; name: string; regId: string; department: string }> = [];
    const seen = new Set<string>();

    students.forEach(s => {
      const key = s.userId || s.id;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: key,
          name: s.name,
          regId: s.rollNumber || s.registrationNumber,
          department: s.departmentName || s.departmentId || ''
        });
      }
    });

    users.filter(u => u.role === 'student').forEach(u => {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        list.push({
          id: u.id,
          name: u.name,
          regId: u.regId,
          department: u.department || u.departmentCode || ''
        });
      }
    });

    return list;
  }, [students, users]);

  // Selected student for Marksheet view (for Admin / HOD / Faculty)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  React.useEffect(() => {
    if (!selectedStudentId && enrolledStudents.length > 0) {
      setSelectedStudentId(enrolledStudents[0].id);
    }
  }, [enrolledStudents, selectedStudentId]);

  React.useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const calculateGrade = (marks: number, max: number): string => {
    if (max <= 0) return 'RA';
    const pct = (marks / max) * 100;
    if (pct >= 90) return 'O';
    if (pct >= 80) return 'A+';
    if (pct >= 70) return 'A';
    if (pct >= 60) return 'B+';
    if (pct >= 50) return 'B';
    return 'RA'; // Re-appear
  };

  // Populate dynamic marks roster from active Firestore students
  React.useEffect(() => {
    const currSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
    if (!currSubject) {
      setMarksEntries([]);
      return;
    }

    const matchingStudents = students.filter(s => {
      const matchDept =
        !currSubject.department ||
        s.departmentName?.toLowerCase().includes(currSubject.department.toLowerCase()) ||
        s.departmentId?.toLowerCase().includes(currSubject.department.toLowerCase()) ||
        currSubject.department.toLowerCase().includes(s.departmentName?.toLowerCase() || '');
      const matchSem = !currSubject.semester || s.semester === currSubject.semester || s.year === Math.ceil(currSubject.semester / 2);
      return matchDept && matchSem && s.status === 'active';
    });

    const matchingUsers = users.filter(u => {
      if (u.role !== 'student' || u.status !== 'active') return false;
      const already = matchingStudents.some(s => s.userId === u.id || s.email === u.email);
      if (already) return false;
      const matchDept = !currSubject.department || u.department.toLowerCase().includes(currSubject.department.toLowerCase());
      return matchDept;
    });

    const combined: StudentMarksEntry[] = [
      ...matchingStudents.map(s => ({
        studentId: s.userId || s.id,
        studentName: s.name,
        usn: s.rollNumber || s.registrationNumber,
        marksObtained: 0,
        maxMarks,
        grade: 'RA',
        remarks: ''
      })),
      ...matchingUsers.map(u => ({
        studentId: u.id,
        studentName: u.name,
        usn: u.regId,
        marksObtained: 0,
        maxMarks,
        grade: 'RA',
        remarks: ''
      }))
    ];

    setMarksEntries(combined);
  }, [selectedSubjectId, maxMarks, students, users, subjects]);

  const updateStudentMark = (studentId: string, value: number) => {
    const clamped = Math.max(0, Math.min(maxMarks, value));
    setMarksEntries(prev =>
      prev.map(e => {
        if (e.studentId === studentId) {
          return {
            ...e,
            marksObtained: clamped,
            maxMarks,
            grade: calculateGrade(clamped, maxMarks)
          };
        }
        return e;
      })
    );
  };

  const handleSaveMarks = (e: React.FormEvent) => {
    e.preventDefault();
    const currSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
    if (!currSubject) return;
    const avgScore = marksEntries.length > 0
      ? Number((marksEntries.reduce((sum, e) => sum + e.marksObtained, 0) / marksEntries.length).toFixed(1))
      : 0;

    recordAssessmentMarks({
      subjectId: currSubject.id,
      subjectCode: currSubject.code,
      subjectName: currSubject.name,
      assessmentType,
      semester: currSubject.semester,
      section,
      maxMarks,
      date: examDate,
      averageScore: avgScore,
      entries: marksEntries
    });

    setSuccessMessage(`Assessment marks for ${currSubject.code} (${assessmentType}) successfully committed to official academic records!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    await deleteAssessmentRecord(assessmentId);
    setDeletingAssessmentId(null);
    setSuccessMessage('Assessment record deleted from database.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePurgeAllDemo = async () => {
    const res = await purgeAllDemoData();
    setSuccessMessage(`Database purged: ${res.purgedTotal} demo records deleted.`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Resolve target student for Marksheet
  // STRICT REAL USER ISOLATION:
  // - Real student: strictly their own personal profile
  // - Admin simulating student view: null (preview mode, 0 personal marks attached)
  // - Faculty / HOD / Admin in management mode: selected candidate from enrolledStudents
  const activeStudentProfile = isRealStudent
    ? { id: currentUser.id, name: currentUser.name, regId: currentUser.regId }
    : isStudent
    ? null
    : enrolledStudents.find(s => s.id === selectedStudentId) || (enrolledStudents.length > 0 ? enrolledStudents[0] : null);

  // Filter marks strictly by the target student ID
  const displayedMarks = React.useMemo(() => {
    if (!activeStudentProfile) return [];
    const targetId = activeStudentProfile.id;
    const targetReg = activeStudentProfile.regId;
    return studentMarks.filter(sm =>
      Boolean(sm.studentId) && (sm.studentId === targetId || sm.studentId === targetReg)
    );
  }, [studentMarks, activeStudentProfile]);

  return (
    <div className="space-y-5">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            <Award className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Continuous Internal Assessment (CIA) & Marks</h1>
            <p className="text-[11px] text-slate-500">
              Outcome-Based Education (OBE) evaluation, internal marks entry & official grade sheets
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center bg-[#F1F5F9] p-0.5 rounded-md border border-[#E2E8F0] gap-1 text-xs">
          {isTeacherOrAdmin && (
            <button
              onClick={() => setActiveTab('entry')}
              className={`px-3 py-1.5 rounded font-medium transition-all ${
                activeTab === 'entry' ? 'bg-[#0F172A] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Enter / Update Marks
            </button>
          )}

          <button
            onClick={() => setActiveTab('studentMarksheet')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'studentMarksheet' ? 'bg-[#0F172A] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Official Marksheet
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'history' ? 'bg-[#0F172A] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assessment Records ({assessments.length})
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. Marks Entry Form */}
      {activeTab === 'entry' && isTeacherOrAdmin && (
        subjects.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center shadow-xs">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-[#0F172A]">No Course Subjects Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Before entering continuous internal assessment marks, please create academic course subjects in the Syllabus Coverage module.
            </p>
          </div>
        ) : (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-white">
            <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Enter Continuous Assessment Marks
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Input student assessment scores; letter grades are automatically computed based on standard cutoffs
            </p>
          </div>

          <form onSubmit={handleSaveMarks} className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Assessment Type</label>
                <select
                  value={assessmentType}
                  onChange={e => setAssessmentType(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="CIA-1">CIA-1 (Theory)</option>
                  <option value="CIA-2">CIA-2 (Theory)</option>
                  <option value="Assignment">Assignment (Continuous)</option>
                  <option value="Practical / Viva">Practical / Viva</option>
                  <option value="Model Exam">Model Examination</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Maximum Marks</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={maxMarks}
                  onChange={e => setMaxMarks(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Assessment Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            <div className="border border-[#E2E8F0] rounded-md overflow-hidden">
              <div className="bg-[#F8FAFC] p-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">
                  Enrolled Candidates ({marksEntries.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Target Max Marks: <strong>{maxMarks}</strong>
                </span>
              </div>

              {marksEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p className="font-semibold text-slate-700">No active students enrolled for this subject.</p>
                  <p className="text-xs text-slate-400 mt-1">Register students in the User Directory matching this department to enter assessment scores.</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {marksEntries.map(entry => (
                    <div key={entry.studentId} className="p-2.5 flex items-center justify-between hover:bg-slate-50 gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{entry.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{entry.usn}</div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-500 font-medium">Marks:</label>
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={entry.marksObtained}
                            onChange={e => updateStudentMark(entry.studentId, Number(e.target.value))}
                            className="w-16 p-1 text-center font-bold rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                          />
                          <span className="text-[11px] text-slate-400">/ {maxMarks}</span>
                        </div>

                        <span className={`w-8 text-center py-0.5 rounded font-bold text-[11px] border ${
                          entry.grade === 'O' || entry.grade === 'A+'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : entry.grade === 'A' || entry.grade === 'B+'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {entry.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={marksEntries.length === 0}
                className={`px-4 py-2 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                  marksEntries.length > 0
                    ? 'bg-[#0F172A] hover:bg-slate-800 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Commit Assessment Records
              </button>
            </div>
          </form>
        </div>
        )
      )}

      {/* 2. Official Student Marksheet */}
      {activeTab === 'studentMarksheet' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div>
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Student Semester Internal Statement of Marks
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isStudent && !isRealStudent ? (
                  <>Role Simulation Mode — Viewing marksheet layout as Administrator (<strong>{currentUser.name}</strong>). Real student marks are isolated.</>
                ) : activeStudentProfile ? (
                  <>Official Continuous Internal Assessment (CIA) summary for <strong>{activeStudentProfile.name}</strong> ({activeStudentProfile.regId})</>
                ) : (
                  'No student selected'
                )}
              </p>
            </div>

            {/* Student Selector for Admin / Faculty / HOD */}
            {!isStudent && enrolledStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Student:</span>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="text-xs p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-semibold text-slate-800 focus:bg-white"
                >
                  {enrolledStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.regId})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!activeStudentProfile && !isStudent ? (
            <div className="p-10 text-center text-slate-500">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No registered students found in the database.</p>
              <p className="text-xs text-slate-400 mt-1">Register student accounts in the User Directory to record and inspect Continuous Internal Assessment (CIA) statements of marks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Course Code & Title</th>
                    <th className="py-2.5 px-3 text-center">CIA-1 (50)</th>
                    <th className="py-2.5 px-3 text-center">CIA-2 (50)</th>
                    <th className="py-2.5 px-3 text-center">Assignment (20)</th>
                    <th className="py-2.5 px-3 text-center">Model Exam (50)</th>
                    <th className="py-2.5 px-3 text-center">Total Internal (50)</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedMarks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">
                          {isStudent && !isRealStudent ? 'Role Simulation Mode — 0 Personal Marks' : '0 Internal Marks Recorded'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                          {isStudent && !isRealStudent
                            ? 'Administrator preview session does not attach any student\'s personal assessment marks. To inspect an individual student\'s marks, navigate to Admin → Users & Students.'
                            : `No assessment marks have been entered for ${activeStudentProfile?.name || 'this student'} yet.`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    displayedMarks.map(sm => (
                      <tr key={sm.subjectId || sm.subjectCode} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[10px] mr-1.5">
                            {sm.subjectCode}
                          </span>
                          {sm.subjectName}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-800">{sm.cia1 ?? 0}</td>
                        <td className="py-3 px-3 text-center text-slate-800">{sm.cia2 ?? 0}</td>
                        <td className="py-3 px-3 text-center text-slate-800">{sm.assignment ?? 0}</td>
                        <td className="py-3 px-3 text-center text-slate-800">{sm.modelExam ?? 0}</td>
                        <td className="py-3 px-3 text-center font-bold text-[#0F172A]">
                          {sm.totalInternal ?? 0}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {sm.grade || 'RA'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
            <span>Minimum qualifying internal threshold: 20/50 (40%)</span>
            <span className="font-semibold text-slate-900">
              {displayedMarks.length > 0 ? (
                <>
                  Projected Internal Performance:{' '}
                  <span className="text-[#4F46E5] font-bold">
                    {(
                      displayedMarks.reduce((sum, s) => sum + (s.totalInternal || 0), 0) /
                      displayedMarks.length
                    ).toFixed(1)}{' '}
                    / 50.0
                  </span>
                </>
              ) : (
                'Pending internal assessments'
              )}
            </span>
          </div>
        </div>
      )}

      {/* 3. Assessment History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Conducted Assessment Records
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official institutional history of continuous internal evaluation examinations
              </p>
            </div>

            {isTeacherOrAdmin && assessments.length > 0 && (
              <button
                onClick={handlePurgeAllDemo}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer self-start sm:self-auto"
              >
                Purge Demo Assessment Records
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {assessments.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">0 Assessment Records Conducted</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No Continuous Internal Assessments (CIA-1, CIA-2, or Model Examinations) have been recorded yet. Faculty can enter marks in the "Enter / Update Marks" tab.
                </p>
              </div>
            ) : (
              assessments.map(ass => (
                <div key={ass.id} className="p-3.5 hover:bg-slate-50 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[10px]">
                          {ass.assessmentType}
                        </span>
                        <h3 className="font-semibold text-slate-900">{ass.subjectCode}: {ass.subjectName}</h3>
                      </div>
                      <p className="text-slate-500 mt-0.5 text-[11px]">
                        Date: {ass.date} • Section: {ass.section} • Class Average: <strong className="text-slate-800">{ass.averageScore} / {ass.maxMarks}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                        {ass.entries?.length || 0} Candidates Evaluated
                      </span>

                      {isTeacherOrAdmin && (
                        <button
                          onClick={() => setDeletingAssessmentId(ass.id)}
                          title="Delete Assessment Record"
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAssessmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl max-w-sm w-full p-5 text-xs">
            <div className="flex items-center gap-2.5 text-red-600 font-bold text-sm mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirm Assessment Deletion</span>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete this assessment record? This will remove evaluated scores from the live database.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingAssessmentId(null)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAssessment(deletingAssessmentId)}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
