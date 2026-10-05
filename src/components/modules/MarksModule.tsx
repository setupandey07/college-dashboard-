import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  UserCheck,
  Search,
  Filter,
  Save,
  BookOpen,
  Calendar,
  Lock,
  Layers,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { AssessmentType, StudentMarksEntry, Subject } from '../../types';
import { getAssessmentFieldKey, VALID_ASSESSMENT_TYPES } from '../../services/firestore/marks';
import { sortStudentsByRollNumber } from '../../lib/academicSort';

export const MarksModule: React.FC = () => {
  const { currentRole, currentUser, actualRole, isSimulatingRole } = useAuth();
  const {
    subjects,
    assessments,
    studentMarks,
    recordAssessmentMarks,
    saveSingleMark,
    deleteAssessmentRecord,
    students,
    users,
    departments,
    sections: dbSections
  } = useAcademicData();

  const isTeacherOrAdmin =
    currentRole === 'faculty' ||
    currentRole === 'lab_assistant' ||
    currentRole === 'hod' ||
    currentRole === 'admin';
  const isStudent = currentRole === 'student';
  const isRealStudent = actualRole === 'student';

  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'studentMarksheet'>(
    isTeacherOrAdmin ? 'entry' : 'studentMarksheet'
  );

  // 1. FILTER SUBJECTS STRICTLY ACCORDING TO AUTHORITATIVE DATABASE ROLE & ASSIGNMENTS (Requirement 2 & 7)
  // - Faculty: ONLY subjects assigned to them (s.facultyId === currentUser.id || currentUser.assignedSubjectId === s.id)
  // - HOD: ONLY subjects belonging to their department
  // - Admin: All subjects across the institution
  const availableSubjects = useMemo(() => {
    if (currentRole === 'admin') {
      return subjects;
    }
    if (currentRole === 'hod') {
      const deptCode = (currentUser.departmentCode || currentUser.department || '').trim().toLowerCase();
      return subjects.filter(s => {
        const subDeptCode = (s.departmentCode || '').trim().toLowerCase();
        const subDeptName = (s.department || '').trim().toLowerCase();
        return (deptCode && (subDeptCode === deptCode || subDeptName.includes(deptCode) || deptCode.includes(subDeptName)));
      });
    }
    if (currentRole === 'faculty' || currentRole === 'lab_assistant') {
      const assignedIds = new Set<string>();
      if (Array.isArray(currentUser?.assignedSubjectIds)) {
        currentUser.assignedSubjectIds.forEach(id => assignedIds.add(id));
      }
      if (currentUser?.assignedSubjectId) {
        assignedIds.add(currentUser.assignedSubjectId);
      }
      const userDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const userDeptName = (currentUser?.department || '').toLowerCase().trim();

      return subjects.filter(s => {
        const isAssigned = assignedIds.has(s.id) || assignedIds.has(s.code) || s.facultyId === currentUser?.id;
        const subDeptCode = (s.departmentCode || '').toUpperCase().trim();
        const subDeptName = (s.department || '').toLowerCase().trim();
        const isDeptMatch = !userDeptCode || subDeptCode === userDeptCode || subDeptName === userDeptName;
        return isAssigned && isDeptMatch;
      });
    }
    return [];
  }, [subjects, currentRole, currentUser]);

  // Form state for marks entry
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('Section B');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('Minor 1');
  const [maxMarks, setMaxMarks] = useState<number>(20);
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Roster of students for marks entry
  const [marksEntries, setMarksEntries] = useState<StudentMarksEntry[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState<string | null>(null);

  // Automatically update maxMarks when assessmentType changes
  const handleAssessmentTypeChange = (type: AssessmentType) => {
    setAssessmentType(type);
    if (type === 'Minor 1' || type === 'Minor 2') {
      setMaxMarks(20);
    } else if (type === 'Mid Sem') {
      setMaxMarks(50);
    } else if (type === 'End Sem') {
      setMaxMarks(100);
    }
  };

  // Sync selected subject when availableSubjects changes
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!selectedSubjectId || !availableSubjects.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
        const subSec = availableSubjects[0].section
          ? (availableSubjects[0].section.startsWith('Section') ? availableSubjects[0].section : `Section ${availableSubjects[0].section}`)
          : currentUser.assignedSection || 'Section B';
        setSelectedSection(subSec);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId, currentUser.assignedSection]);

  // Active subject object
  const currentSubject = useMemo(() => {
    return availableSubjects.find(s => s.id === selectedSubjectId) || null;
  }, [availableSubjects, selectedSubjectId]);

  // Synchronize section when subject changes
  useEffect(() => {
    if (currentSubject?.section) {
      const formatted = currentSubject.section.startsWith('Section')
        ? currentSubject.section
        : `Section ${currentSubject.section}`;
      setSelectedSection(formatted);
    }
  }, [currentSubject]);

  // 2. ENROLLED STUDENTS FOR MARKSHEET (Strictly from database, deduplicated)
  const enrolledStudents = useMemo(() => {
    const list: Array<{ id: string; name: string; regId: string; department: string; year?: number; section?: string }> = [];
    const seen = new Set<string>();

    students.forEach(s => {
      const key = s.userId || s.id;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: key,
          name: s.name,
          regId: s.rollNumber || s.registrationNumber,
          department: s.departmentName || s.departmentId || '',
          year: s.year,
          section: s.section
        });
      }
    });

    users.filter(u => u.role === 'student' && u.status === 'active').forEach(u => {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        list.push({
          id: u.id,
          name: u.name,
          regId: u.regId,
          department: u.department || u.departmentCode || '',
          year: u.semester ? Math.ceil(u.semester / 2) : undefined,
          section: u.section
        });
      }
    });

    return sortStudentsByRollNumber(list);
  }, [students, users]);

  // Selected student for Marksheet view (for Admin / HOD / Faculty)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    if (!selectedStudentId && enrolledStudents.length > 0) {
      setSelectedStudentId(enrolledStudents[0].id);
    }
  }, [enrolledStudents, selectedStudentId]);

  // 3. POPULATE STUDENTS ROSTER FOR MARKS ENTRY (Strictly matching Subject + Year + Section + Database marks)
  useEffect(() => {
    if (!currentSubject) {
      setMarksEntries([]);
      return;
    }

    const targetDept = (currentSubject.departmentCode || currentSubject.department || '').trim().toLowerCase();
    const targetYear = currentSubject.year || (currentSubject.semester ? Math.ceil(currentSubject.semester / 2) : 2);
    const targetSem = currentSubject.semester || targetYear * 2 - 1;
    const targetSec = selectedSection.replace(/^Section\s+/i, '').trim().toLowerCase();

    // Matching students from students collection
    const matchingStudents = students.filter(s => {
      if (s.status !== 'active') return false;
      const sDept = (s.departmentId || s.departmentName || '').trim().toLowerCase();
      const matchDept = !targetDept || sDept.includes(targetDept) || targetDept.includes(sDept);
      const sYear = s.year || (s.semester ? Math.ceil(s.semester / 2) : 0);
      const matchYear = !targetYear || sYear === targetYear || s.semester === targetSem;
      const sSec = (s.section || '').replace(/^Section\s+/i, '').trim().toLowerCase();
      const matchSec = !targetSec || sSec === targetSec;
      return matchDept && matchYear && matchSec;
    });

    // Matching students from users collection
    const matchingUsers = users.filter(u => {
      if (u.role !== 'student' || u.status !== 'active') return false;
      const already = matchingStudents.some(s => s.userId === u.id || s.email === u.email);
      if (already) return false;
      const uDept = (u.departmentCode || u.department || '').trim().toLowerCase();
      const matchDept = !targetDept || uDept.includes(targetDept) || targetDept.includes(uDept);
      const uYear = u.semester ? Math.ceil(u.semester / 2) : 0;
      const matchYear = !targetYear || uYear === targetYear || u.semester === targetSem;
      const uSec = (u.section || '').replace(/^Section\s+/i, '').trim().toLowerCase();
      const matchSec = !targetSec || uSec === targetSec;
      return matchDept && matchYear && matchSec;
    });

    const fieldKey = getAssessmentFieldKey(assessmentType);

    // Build roster loading existing mark from studentMarks (or null if not entered)
    const combined: StudentMarksEntry[] = [
      ...matchingStudents.map(s => {
        const studentId = s.userId || s.id;
        const roll = s.rollNumber || s.registrationNumber;
        const existingRecord = studentMarks.find(
          sm => (sm.studentId === studentId || sm.studentId === roll) &&
                (sm.subjectId === currentSubject.id || sm.subjectCode === currentSubject.code)
        );
        const existingMark = existingRecord ? existingRecord[fieldKey] : null;

        return {
          studentId,
          studentName: s.name,
          usn: roll,
          marksObtained: typeof existingMark === 'number' ? existingMark : null,
          maxMarks,
          remarks: ''
        };
      }),
      ...matchingUsers.map(u => {
        const existingRecord = studentMarks.find(
          sm => (sm.studentId === u.id || sm.studentId === u.regId) &&
                (sm.subjectId === currentSubject.id || sm.subjectCode === currentSubject.code)
        );
        const existingMark = existingRecord ? existingRecord[fieldKey] : null;

        return {
          studentId: u.id,
          studentName: u.name,
          usn: u.regId,
          marksObtained: typeof existingMark === 'number' ? existingMark : null,
          maxMarks,
          remarks: ''
        };
      })
    ];

    // Strict numerical sorting by roll number / USN
    setMarksEntries(sortStudentsByRollNumber(combined));
  }, [currentSubject, selectedSection, assessmentType, maxMarks, students, users, studentMarks]);

  // Update in-memory entry for a student
  const updateStudentMark = (studentId: string, valueStr: string) => {
    if (valueStr.trim() === '') {
      setMarksEntries(prev =>
        prev.map(e => e.studentId === studentId ? { ...e, marksObtained: null } : e)
      );
      return;
    }
    const num = Number(valueStr);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(maxMarks, num));
    setMarksEntries(prev =>
      prev.map(e => e.studentId === studentId ? { ...e, marksObtained: clamped } : e)
    );
  };

  // Commit single student's mark immediately
  const handleSaveSingleStudent = async (entry: StudentMarksEntry) => {
    if (!currentSubject) return;
    setIsSavingEntry(entry.studentId);
    try {
      await saveSingleMark({
        studentId: entry.studentId,
        studentName: entry.studentName,
        rollNumber: entry.usn,
        subjectId: currentSubject.id,
        subjectCode: currentSubject.code,
        subjectName: currentSubject.name,
        departmentCode: currentSubject.departmentCode || currentSubject.department,
        year: currentSubject.year,
        section: selectedSection,
        semester: currentSubject.semester,
        assessmentType,
        marksObtained: entry.marksObtained,
        maxMarks
      });

      setSuccessMessage(`Saved ${assessmentType} mark for ${entry.studentName} (${entry.marksObtained !== null ? entry.marksObtained : 'Not Entered'})!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save student mark.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSavingEntry(null);
    }
  };

  // Commit all modified marks for the assessment
  const handleSaveAllMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject) return;

    try {
      const validEntries = marksEntries.filter(e => e.marksObtained !== null);
      const avgScore = validEntries.length > 0
        ? Number((validEntries.reduce((sum, e) => sum + (e.marksObtained || 0), 0) / validEntries.length).toFixed(1))
        : null;

      await recordAssessmentMarks({
        subjectId: currentSubject.id,
        subjectCode: currentSubject.code,
        subjectName: currentSubject.name,
        assessmentType,
        departmentCode: currentSubject.departmentCode || currentSubject.department,
        semester: currentSubject.semester,
        year: currentSubject.year,
        section: selectedSection,
        maxMarks,
        date: examDate,
        averageScore: avgScore,
        facultyId: currentUser.id,
        facultyName: currentUser.name,
        entries: marksEntries
      });

      setSuccessMessage(`Official assessment records for ${currentSubject.code} (${assessmentType}) successfully committed to database!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to commit assessment marks.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    await deleteAssessmentRecord(assessmentId);
    setDeletingAssessmentId(null);
    setSuccessMessage('Assessment record deleted from database.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 4. RESOLVE TARGET STUDENT FOR OFFICIAL MARKSHEET (Strict Isolation)
  // Student sees ONLY own marks. Admin NEVER receives another student's marks or selector.
  const isAuthorizedStaffForMarksheet = actualRole === 'faculty' || actualRole === 'hod';
  const activeStudentProfile = isRealStudent
    ? { id: currentUser.id, name: currentUser.name, regId: currentUser.regId, department: currentUser.department }
    : actualRole === 'admin'
    ? null
    : isAuthorizedStaffForMarksheet
    ? enrolledStudents.find(s => s.id === selectedStudentId) || (enrolledStudents.length > 0 ? enrolledStudents[0] : null)
    : null;

  // Authoritative marks strictly from studentMarks collection
  const displayedMarks = useMemo(() => {
    if (!activeStudentProfile) return [];
    const targetId = activeStudentProfile.id;
    const targetReg = activeStudentProfile.regId;
    return studentMarks.filter(sm =>
      Boolean(sm.studentId) && (sm.studentId === targetId || sm.studentId === targetReg)
    );
  }, [studentMarks, activeStudentProfile]);

  return (
    <div className="space-y-5">
      {/* Module Header matching SaaS styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#D9E6DE] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#14382C]">Marks & Internal Assessments</h1>
            <p className="text-xs text-[#527568] mt-0.5">
              100% database-driven evaluation: Minor 1, Minor 2, Mid Sem, and End Sem records
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center bg-[#EBF3EE] p-1 rounded-xl border border-[#D9E6DE] gap-1 text-xs">
          {isTeacherOrAdmin && (
            <button
              onClick={() => setActiveTab('entry')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'entry' ? 'bg-[#1B8B67] text-white shadow-xs' : 'text-[#3D6052] hover:text-[#14382C]'
              }`}
            >
              Enter / Update Marks
            </button>
          )}

          <button
            onClick={() => setActiveTab('studentMarksheet')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'studentMarksheet' ? 'bg-[#1B8B67] text-white shadow-xs' : 'text-[#3D6052] hover:text-[#14382C]'
            }`}
          >
            Official Marksheet
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-[#1B8B67] text-white shadow-xs' : 'text-[#3D6052] hover:text-[#14382C]'
            }`}
          >
            Assessment Records ({assessments.length})
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MARKS ENTRY TAB                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'entry' && isTeacherOrAdmin && (
        availableSubjects.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center shadow-xs">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              {currentRole === 'faculty' ? 'No Course Subjects Assigned to You' : 'No Academic Course Subjects Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {currentRole === 'faculty'
                ? 'Faculty members can only update marks for subjects explicitly assigned to them in the database. Please open your Profile to assign your subject, department, year, and section, or contact your HOD.'
                : 'No course subjects found in the database matching this division. Create course subjects in the Syllabus Coverage module.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Enter / Update Assessment Marks
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Update only the selected assessment; unentered fields remain untouched in the database
                </p>
              </div>

              {/* Security Boundary Indicator */}
              <div className="flex items-center gap-1.5 text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>
                  Role: <strong>{currentRole.toUpperCase()}</strong> • Scope:{' '}
                  {currentRole === 'admin'
                    ? 'Global (All Subjects)'
                    : currentRole === 'hod'
                    ? `Department (${currentUser.departmentCode || currentUser.department})`
                    : `Assigned Subjects Only (${availableSubjects.length})`}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveAllMarks} className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
                {/* 1. Subject */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Subject ({availableSubjects.length})
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    {availableSubjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name} {s.section ? `(${s.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Section */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={selectedSection}
                    onChange={e => setSelectedSection(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                    <option value="Section C">Section C</option>
                    <option value="Section D">Section D</option>
                  </select>
                </div>

                {/* 3. Assessment Type (Strictly 4 options; No CIA) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Assessment Type
                  </label>
                  <select
                    value={assessmentType}
                    onChange={e => handleAssessmentTypeChange(e.target.value as AssessmentType)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    {VALID_ASSESSMENT_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Maximum Marks */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={maxMarks}
                    onChange={e => setMaxMarks(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5] font-semibold"
                  />
                </div>

                {/* 5. Date */}
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

              {/* Roster Table */}
              <div className="border border-[#E2E8F0] rounded-md overflow-hidden">
                <div className="bg-[#F8FAFC] p-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">
                    Enrolled Students ({marksEntries.length}) • {currentSubject?.departmentCode || currentSubject?.department} Year {currentSubject?.year || '2'} {selectedSection}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Target Max Marks: <strong className="text-slate-900">{maxMarks}</strong>
                  </span>
                </div>

                {marksEntries.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">0 students enrolled in this Class & Section.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No active students found in the database matching {currentSubject?.departmentCode || currentSubject?.department}, Year {currentSubject?.year || '2'}, and {selectedSection}.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {marksEntries.map(entry => (
                      <div key={entry.studentId} className="p-2.5 flex items-center justify-between hover:bg-slate-50 gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{entry.studentName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{entry.usn}</div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] text-slate-500 font-medium">{assessmentType}:</label>
                            <input
                              type="number"
                              min="0"
                              max={maxMarks}
                              placeholder="Not Entered"
                              value={entry.marksObtained !== null ? entry.marksObtained : ''}
                              onChange={e => updateStudentMark(entry.studentId, e.target.value)}
                              className="w-24 p-1 text-center font-bold rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] placeholder:text-slate-300 placeholder:font-normal placeholder:text-[10px]"
                            />
                            <span className="text-[11px] text-slate-400">/ {maxMarks}</span>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`w-24 text-center py-0.5 rounded font-bold text-[10px] border ${
                              entry.marksObtained !== null
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {entry.marksObtained !== null ? `Entered: ${entry.marksObtained}` : 'Not Entered'}
                          </span>

                          {/* Quick Individual Save Button */}
                          <button
                            type="button"
                            onClick={() => handleSaveSingleStudent(entry)}
                            disabled={isSavingEntry === entry.studentId}
                            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1"
                            title="Save individual mark"
                          >
                            <Save className="w-3 h-3 text-[#4F46E5]" />
                            <span className="hidden sm:inline">Save</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-slate-500">
                  {marksEntries.filter(e => e.marksObtained !== null).length} / {marksEntries.length} evaluated
                </span>

                <button
                  type="submit"
                  disabled={marksEntries.length === 0}
                  className={`px-4 py-2 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                    marksEntries.length > 0
                      ? 'bg-[#0F172A] hover:bg-slate-800 text-white cursor-pointer shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Commit Assessment Records ({assessmentType})
                </button>
              </div>
            </form>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 2. OFFICIAL STUDENT MARKSHEET TAB (Single Source of Truth)                 */}
      {/* ========================================================================= */}
      {activeTab === 'studentMarksheet' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div>
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Official Statement of Assessment Marks
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isRealStudent ? (
                  <>Authoritative evaluation record for <strong>{activeStudentProfile?.name}</strong> ({activeStudentProfile?.regId})</>
                ) : actualRole === 'admin' ? (
                  <>Administrator Access — Student Records Isolated</>
                ) : activeStudentProfile ? (
                  <>Authoritative evaluation record for <strong>{activeStudentProfile.name}</strong> ({activeStudentProfile.regId})</>
                ) : (
                  'No student selected'
                )}
              </p>
            </div>

            {/* Student Selector ONLY for authorized academic workflow (Faculty/HOD). Strictly NEVER for Admin. */}
            {isAuthorizedStaffForMarksheet && enrolledStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Student:</span>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="text-xs p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-semibold text-slate-800 focus:bg-white"
                >
                  {enrolledStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.regId}) - {s.department}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {actualRole === 'admin' ? (
            <div className="p-12 text-center text-slate-500 bg-white">
              <ShieldCheck className="w-10 h-10 text-[#1B8B67] mx-auto mb-2" />
              <p className="font-semibold text-slate-800">
                {isSimulatingRole ? 'Role Simulation Mode — Student Marksheet Isolated' : 'Administrator Marksheet Access Protocol'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                {isSimulatingRole
                  ? `Viewing student marksheet layout as Administrator (${currentUser.name}). Student academic records remain strictly isolated to respect student privacy.`
                  : 'Individual student academic marks are private student records. As an Administrator, please use the Enter / Update Marks tab or the Users & Students directory to manage and audit course evaluations.'}
              </p>
            </div>
          ) : !activeStudentProfile && !isRealStudent ? (
            <div className="p-10 text-center text-slate-500">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No registered students found in the database.</p>
              <p className="text-xs text-slate-400 mt-1">Register student accounts in the User Directory to record and inspect official statements of marks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Course Code & Title</th>
                    <th className="py-2.5 px-3 text-center">Minor 1</th>
                    <th className="py-2.5 px-3 text-center">Minor 2</th>
                    <th className="py-2.5 px-3 text-center">Mid Sem</th>
                    <th className="py-2.5 px-3 text-center">End Sem</th>
                    <th className="py-2.5 px-3 text-center">Total Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedMarks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">
                          {isStudent && !isRealStudent ? 'Role Simulation Mode — 0 Personal Marks' : '0 Assessment Marks Recorded'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                          {isStudent && !isRealStudent
                            ? 'Administrator preview session does not attach any student\'s personal assessment marks. To inspect an individual student\'s marks, navigate to Admin → Users & Students.'
                            : `No assessment marks have been entered for ${activeStudentProfile?.name || 'this student'} in the database yet.`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    displayedMarks.map(sm => {
                      const m1 = typeof sm.minor1 === 'number' ? sm.minor1 : null;
                      const m2 = typeof sm.minor2 === 'number' ? sm.minor2 : null;
                      const mid = typeof sm.midSem === 'number' ? sm.midSem : null;
                      const end = typeof sm.endSem === 'number' ? sm.endSem : null;
                      const entered = [m1, m2, mid, end].filter((m): m is number => m !== null);
                      const total = entered.length > 0 ? entered.reduce((a, b) => a + b, 0) : null;

                      return (
                        <tr key={sm.subjectId || sm.subjectCode} className="hover:bg-slate-50/60">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[10px] mr-1.5 font-bold">
                              {sm.subjectCode}
                            </span>
                            {sm.subjectName}
                          </td>
                          <td className="py-3 px-3 text-center font-medium">
                            {m1 !== null ? (
                              <span className="font-bold text-slate-900">{m1}</span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">Not Entered</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-medium">
                            {m2 !== null ? (
                              <span className="font-bold text-slate-900">{m2}</span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">Not Entered</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-medium">
                            {mid !== null ? (
                              <span className="font-bold text-slate-900">{mid}</span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">Not Entered</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-medium">
                            {end !== null ? (
                              <span className="font-bold text-slate-900">{end}</span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">Not Entered</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-[#0F172A]">
                            {total !== null ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-900">
                                {total}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">Not Entered</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
            <span>Authoritative Institutional Grade Sheet</span>
            <span className="font-semibold text-slate-900">
              {displayedMarks.length > 0 ? (
                <>Recorded Courses with Marks: <span className="text-[#4F46E5] font-bold">{displayedMarks.length}</span></>
              ) : (
                'Pending examination marks'
              )}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONDUCTED ASSESSMENT RECORDS TAB                                       */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Conducted Assessment Records
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Institutional history of Minor 1, Minor 2, Mid Sem, and End Sem evaluations
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {assessments.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">0 Assessment Records Conducted</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No Minor 1, Minor 2, Mid Sem, or End Sem assessments have been recorded yet. Faculty can enter marks in the "Enter / Update Marks" tab.
                </p>
              </div>
            ) : (
              assessments.map(ass => (
                <div key={ass.id} className="p-3.5 hover:bg-slate-50 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-[10px]">
                          {ass.assessmentType}
                        </span>
                        <h3 className="font-semibold text-slate-900">{ass.subjectCode}: {ass.subjectName}</h3>
                      </div>
                      <p className="text-slate-500 mt-0.5 text-[11px]">
                        Date: {ass.date} • Section: {ass.section} • Max Marks: {ass.maxMarks}
                        {ass.averageScore !== null && ass.averageScore !== undefined && (
                          <> • Class Average: <strong className="text-slate-800">{ass.averageScore} / {ass.maxMarks}</strong></>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                        {ass.entries?.filter(e => e.marksObtained !== null).length || 0} Candidates Evaluated
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
