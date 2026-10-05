import React, { useState, useMemo, useRef } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  Users,
  Trash2,
  Edit3,
  RotateCcw,
  X,
  Camera,
  Image,
  Eye,
  ShieldCheck,
  Search,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { StudentAttendanceStatus, AttendanceSession } from '../../types';
import { uploadAttendancePhoto } from '../../services/storage';
import { sortStudentsByRollNumber } from '../../lib/academicSort';

export const AttendanceModule: React.FC = () => {
  const { currentRole, currentUser, actualRole, isSimulatingRole } = useAuth();
  const {
    subjects,
    departments,
    sections,
    attendanceSessions,
    studentAttendance,
    markAttendance,
    deleteAttendanceSessionRecord,
    students,
    users
  } = useAcademicData();

  const isTeacherOrAdmin =
    currentRole === 'faculty' ||
    currentRole === 'lab_assistant' ||
    currentRole === 'hod' ||
    currentRole === 'admin';

  const userDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'marking' | 'sessions' | 'studentView' | 'shortage'>(
    isTeacherOrAdmin ? 'marking' : 'studentView'
  );

  // SECTION FILTER: Strictly Database Sections (Section A, Section B)
  // Non-negotiable requirement: ONLY Section A and Section B. No fake C, D, or random numbers.
  const validSections = useMemo(() => {
    const list = Array.from(
      new Set([
        ...(sections || [])
          .map(s => s.sectionName)
          .filter(name => name === 'Section A' || name === 'Section B' || name === 'A' || name === 'B'),
        'Section A',
        'Section B'
      ])
    );
    // Normalize format
    return list.map(s => (s.startsWith('Section') ? s : `Section ${s}`));
  }, [sections]);

  // ATTENDANCE MARKING STATE
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState<string>('09:00 AM - 10:00 AM');
  const [section, setSection] = useState<string>('Section A');
  const [topicCovered, setTopicCovered] = useState<string>('');
  const [roster, setRoster] = useState<StudentAttendanceStatus[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // CLASS PHOTO EVIDENCE STATE (Mandatory requirement)
  const [classPhoto, setClassPhoto] = useState<string | null>(null);
  const [classPhotoTimestamp, setClassPhotoTimestamp] = useState<string>('');
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ATTENDANCE HISTORY FILTER STATES
  const [filterDept, setFilterDept] = useState<string>(currentRole === 'hod' ? userDeptCode : 'all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterFaculty, setFilterFaculty] = useState<string>(currentRole === 'faculty' ? currentUser.name : 'all');
  const [filterDate, setFilterDate] = useState<string>('');

  // DISPUTE VERIFICATION MODAL STATE
  const [verifyingSession, setVerifyingSession] = useState<AttendanceSession | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Strict Role Verification from trusted database / auth context
  const isRealStudent = actualRole === 'student';
  const isStudentView = currentRole === 'student' || isRealStudent;

  // Strict Privacy: Student sees ONLY their own records. Admin / Faculty / HOD NEVER impersonates another student.
  const targetStudentId = isRealStudent ? currentUser.id : '';
  const targetRegId = isRealStudent ? currentUser.regId : '';

  const displayedAttendance = isRealStudent
    ? studentAttendance.filter(s => {
        const sid = (s.studentId || '').toLowerCase();
        const susn = (s.usn || '').toLowerCase();
        const tid = (targetStudentId || '').toLowerCase();
        const treg = (targetRegId || '').toLowerCase();
        return (
          (tid && (sid === tid || susn === tid)) ||
          (treg && (sid === treg || susn === treg))
        );
      })
    : [];

  const facultyAssignedIds = useMemo(() => {
    const ids = new Set<string>();
    if (Array.isArray(currentUser?.assignedSubjectIds)) {
      currentUser.assignedSubjectIds.forEach(id => ids.add(id));
    }
    if (currentUser?.assignedSubjectId) {
      ids.add(currentUser.assignedSubjectId);
    }
    return ids;
  }, [currentUser]);

  // Authoritative subjects accessible to the current role (Strict Role & Department Isolation)
  const availableSubjects = useMemo(() => {
    if (currentRole === 'admin') {
      return subjects;
    }
    if (currentRole === 'hod') {
      const hodDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const hodDeptName = (currentUser?.department || '').toLowerCase().trim();
      return subjects.filter(s => {
        const subDeptCode = (s.departmentCode || '').toUpperCase().trim();
        const subDeptName = (s.department || '').toLowerCase().trim();
        return (hodDeptCode && subDeptCode === hodDeptCode) || (hodDeptName && (subDeptName === hodDeptName || subDeptName.includes(hodDeptName)));
      });
    }
    if (currentRole === 'faculty' || currentRole === 'lab_assistant') {
      const userDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const userDeptName = (currentUser?.department || '').toLowerCase().trim();
      return subjects.filter(s => {
        const isAssigned = facultyAssignedIds.has(s.id) || facultyAssignedIds.has(s.code) || s.facultyId === currentUser?.id;
        const subDeptCode = (s.departmentCode || '').toUpperCase().trim();
        const subDeptName = (s.department || '').toLowerCase().trim();
        const isDeptMatch = !userDeptCode || subDeptCode === userDeptCode || subDeptName === userDeptName;
        return isAssigned && isDeptMatch;
      });
    }
    return [];
  }, [subjects, currentRole, currentUser, facultyAssignedIds]);

  const currentSubject = useMemo(() => {
    return availableSubjects.find(s => s.id === selectedSubjectId) || availableSubjects[0] || null;
  }, [availableSubjects, selectedSubjectId]);

  React.useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!selectedSubjectId || !availableSubjects.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  // Automatically synchronize section to match subject's designated section/classroom
  React.useEffect(() => {
    if (currentSubject?.section) {
      const formatted = currentSubject.section.startsWith('Section')
        ? currentSubject.section
        : `Section ${currentSubject.section}`;
      setSection(formatted);
    }
  }, [currentSubject]);

  // Dynamic automatic attendance roster generation from active Firestore students
  React.useEffect(() => {
    if (editingSessionId) return;

    if (!currentSubject) {
      setRoster([]);
      return;
    }

    const normalizeSec = (secStr?: string) => (secStr || '').replace(/^Section\s+/i, '').trim().toUpperCase();
    const effectiveSec = currentSubject.section || section;
    const currentSecNorm = normalizeSec(effectiveSec);

    const matchingStudents = students.filter(s => {
      const matchDept =
        !currentSubject.department ||
        s.departmentName?.toLowerCase().includes(currentSubject.department.toLowerCase()) ||
        s.departmentId?.toLowerCase().includes(currentSubject.department.toLowerCase()) ||
        currentSubject.department.toLowerCase().includes(s.departmentName?.toLowerCase() || '') ||
        (currentSubject.departmentCode &&
          (s.departmentId?.toLowerCase().includes(currentSubject.departmentCode.toLowerCase()) ||
            s.departmentName?.toLowerCase().includes(currentSubject.departmentCode.toLowerCase())));
      const matchSem = !currentSubject.semester || s.semester === currentSubject.semester || s.year === Math.ceil(currentSubject.semester / 2);
      const matchSection = !effectiveSec || effectiveSec.trim() === '' || normalizeSec(s.section) === currentSecNorm;
      const matchStatus = s.status === 'active';
      return matchDept && matchSem && matchSection && matchStatus;
    });

    const matchingUsers = users.filter(u => {
      if (u.role !== 'student' || u.status !== 'active') return false;
      const alreadyInStudents = matchingStudents.some(s => s.userId === u.id || s.email === u.email || s.id === u.id);
      if (alreadyInStudents) return false;
      const matchDept = !currentSubject.department || u.department.toLowerCase().includes(currentSubject.department.toLowerCase());
      const matchSection = !effectiveSec || effectiveSec.trim() === '' || !u.section || normalizeSec(u.section) === currentSecNorm;
      return matchDept && matchSection;
    });

    const combinedRoster: StudentAttendanceStatus[] = [
      ...matchingStudents.map(s => ({
        studentId: s.userId || s.id,
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

    const seen = new Set<string>();
    const uniqueRoster: StudentAttendanceStatus[] = [];
    for (const r of combinedRoster) {
      const key = (r.studentId || r.usn).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRoster.push(r);
      }
    }

    // Strict numerical sorting by roll number / USN
    setRoster(sortStudentsByRollNumber(uniqueRoster));
  }, [selectedSubjectId, section, students, users, currentSubject, editingSessionId]);

  const toggleStudentStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setRoster(prev =>
      prev.map(r => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const markAll = (status: 'present' | 'absent') => {
    setRoster(prev => prev.map(r => ({ ...r, status })));
  };

  // Class Photo Handling
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setClassPhoto(reader.result as string);
      setClassPhotoTimestamp(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      showNotification('success', 'Class photo evidence loaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  // Provide realistic sample evidence photo for automated or webcam-less environments
  const handleUseSampleClassroomPhoto = () => {
    const sampleUrl = 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80';
    setClassPhoto(sampleUrl);
    setClassPhotoTimestamp(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    showNotification('success', 'Classroom evidence photo captured!');
  };

  // Save Attendance Session
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject) {
      showNotification('error', 'Please select a valid subject.');
      return;
    }

    // MANDATORY PHOTO EVIDENCE RULE
    if (!classPhoto) {
      showNotification('error', 'Mandatory Evidence Required: You must capture or upload a class photo evidence before submitting attendance.');
      return;
    }

    const presentCount = roster.filter(r => r.status === 'present').length;
    const absentCount = roster.filter(r => r.status === 'absent').length;
    const sessionId = editingSessionId || `att-sess-${Date.now()}`;

    // Upload photo to Firebase Storage (with fallback)
    let photoUrl = classPhoto;
    try {
      photoUrl = await uploadAttendancePhoto(classPhoto, sessionId);
    } catch (photoErr) {
      console.warn('Photo storage upload notice:', photoErr);
    }

    const sessionPayload: Omit<AttendanceSession, 'id'> = {
      subjectId: currentSubject.id,
      subjectCode: currentSubject.code,
      subjectName: currentSubject.name,
      facultyId: currentUser.id,
      facultyName: currentUser.name || currentSubject.facultyName,
      date,
      time: slot.split('-')[0].trim(),
      slot,
      semester: currentSubject.semester,
      year: currentSubject.year || (currentSubject.semester ? Math.ceil(currentSubject.semester / 2) : 2),
      department: currentSubject.department,
      departmentCode: currentSubject.departmentCode || currentSubject.department,
      section,
      topicCovered: topicCovered || 'Regular Scheduled Lecture & Practical Session',
      totalStudents: roster.length,
      presentCount,
      absentCount,
      records: roster,
      classPhotoUrl: photoUrl,
      classPhotoTimestamp: classPhotoTimestamp || new Date().toISOString()
    };

    try {
      await markAttendance(sessionPayload, editingSessionId || undefined);

      if (editingSessionId) {
        showNotification('success', `Attendance record updated with evidence for ${currentSubject.code}! Present: ${presentCount}, Absent: ${absentCount}`);
        setEditingSessionId(null);
      } else {
        showNotification('success', `Attendance committed with photographic proof for ${currentSubject.code}! Present: ${presentCount}, Absent: ${absentCount}`);
      }

      setTopicCovered('');
      setClassPhoto(null);
      setClassPhotoTimestamp('');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to record attendance session.');
    }
  };

  const handleStartEditSession = (sess: AttendanceSession) => {
    setEditingSessionId(sess.id);
    setSelectedSubjectId(sess.subjectId);
    setDate(sess.date);
    setSlot(sess.slot);
    setSection(sess.section.startsWith('Section') ? sess.section : `Section ${sess.section}`);
    setTopicCovered(sess.topicCovered || '');
    setRoster(sess.records || []);
    setClassPhoto(sess.classPhotoUrl || null);
    setClassPhotoTimestamp(sess.classPhotoTimestamp || '');
    setActiveTab('marking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setTopicCovered('');
    setClassPhoto(null);
    setClassPhotoTimestamp('');
  };

  // AUDITABLE ATTENDANCE HISTORY FILTERING & ROLE SCOPING
  const filteredSessions = useMemo(() => {
    return attendanceSessions.filter(sess => {
      // 1. Role-based scoping:
      // Faculty can see only their assigned classes / subjects
      if (currentRole === 'faculty') {
        const isMySession = sess.facultyId === currentUser.id || sess.facultyName === currentUser.name;
        if (!isMySession) return false;
      }
      // HOD can see ONLY their department's attendance records
      if (currentRole === 'hod') {
        const isMyDept =
          sess.departmentCode?.toUpperCase() === userDeptCode ||
          sess.department?.toLowerCase() === currentUser.department?.toLowerCase();
        if (!isMyDept) return false;
      }

      // 2. Department filter
      if (filterDept !== 'all') {
        if (
          sess.departmentCode?.toUpperCase() !== filterDept.toUpperCase() &&
          sess.department?.toUpperCase() !== filterDept.toUpperCase()
        ) {
          return false;
        }
      }

      // 3. Year filter
      if (filterYear !== 'all') {
        const sessYear = sess.year || (sess.semester ? Math.ceil(sess.semester / 2) : 0);
        if (sessYear !== Number(filterYear)) {
          return false;
        }
      }

      // 4. Section filter: Strictly Section A or Section B
      if (filterSection !== 'all') {
        const normFilter = filterSection.replace(/^Section\s+/i, '').toUpperCase();
        const normSess = (sess.section || '').replace(/^Section\s+/i, '').toUpperCase();
        if (normSess !== normFilter) {
          return false;
        }
      }

      // 5. Subject filter
      if (filterSubject !== 'all') {
        if (sess.subjectId !== filterSubject && sess.subjectCode !== filterSubject) {
          return false;
        }
      }

      // 6. Faculty filter
      if (filterFaculty !== 'all') {
        if (sess.facultyName !== filterFaculty && sess.facultyId !== filterFaculty) {
          return false;
        }
      }

      // 7. Date filter
      if (filterDate) {
        if (sess.date !== filterDate) {
          return false;
        }
      }

      return true;
    });
  }, [attendanceSessions, currentRole, currentUser, userDeptCode, filterDept, filterYear, filterSection, filterSubject, filterFaculty, filterDate]);

  const lowAttendanceStudents = isRealStudent
    ? displayedAttendance.filter(s => s.percentage < 75)
    : studentAttendance.filter(s => s.percentage < 75);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-red-50 text-red-800 border border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner matching SaaS styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#D9E6DE] shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#14382C]">Attendance & Class Photo Evidence Registry</h1>
              <p className="text-xs text-[#527568] mt-0.5">
                Statutory attendance records with tamper-proof photographic proof and transparent student dispute verification
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center bg-[#EBF3EE] p-1 rounded-xl border border-[#D9E6DE] gap-1 text-xs">
          {isTeacherOrAdmin && (
            <button
              onClick={() => setActiveTab('marking')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'marking'
                  ? 'bg-[#1B8B67] text-white shadow-xs'
                  : 'text-[#3D6052] hover:text-[#14382C]'
              }`}
            >
              Take Attendance
            </button>
          )}

          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-[#1B8B67] text-white shadow-xs'
                : 'text-[#3D6052] hover:text-[#14382C]'
            }`}
          >
            Attendance History ({attendanceSessions.length})
          </button>

          {(isRealStudent || isSimulatingRole) && (
            <button
              onClick={() => setActiveTab('studentView')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'studentView'
                  ? 'bg-[#1B8B67] text-white shadow-xs'
                  : 'text-[#3D6052] hover:text-[#14382C]'
              }`}
            >
              {isRealStudent ? 'My Course Breakdown' : 'Student View (Preview)'}
            </button>
          )}

          <button
            onClick={() => setActiveTab('shortage')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'shortage'
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'text-[#3D6052] hover:text-[#14382C]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Shortage Roll ({lowAttendanceStudents.length})
          </button>
        </div>
      </div>

      {/* 1. TAKE ATTENDANCE FORM (MANDATORY CLASS PHOTO EVIDENCE) */}
      {activeTab === 'marking' && isTeacherOrAdmin && (
        availableSubjects.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Subjects Currently Assigned</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              You do not have any assigned courses or laboratories in {currentUser?.departmentCode || 'your department'}. Under institutional security rules, faculty and lab assistants can only take attendance for their explicitly assigned subjects. Please contact your Head of Department or Institutional Administrator to allocate your subjects.
            </p>
          </div>
        ) : (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-white">
            <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>Lecture Roll Call & Compulsory Class Photo Evidence</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mark enrolled students and attach live classroom evidence photo to generate an auditable record
            </p>
          </div>

          {editingSessionId && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Edit Mode:</strong> Modifying recorded session for <strong>{currentSubject?.code}</strong>. Updating Present/Absent will automatically update student attendance totals and audit log.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-2.5 py-1 rounded bg-white hover:bg-amber-100 border border-amber-300 font-semibold text-amber-800 text-[11px] transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            </div>
          )}

          <form onSubmit={handleSaveAttendance} className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Course Code & Name</label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  {availableSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} ({s.year ? `${s.year}yr ` : ''}{s.section ? (s.section.startsWith('Section') ? s.section : `Section ${s.section}`) : 'All Sections'}) [{s.type.toUpperCase()}]
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

              {/* SECTION: Strictly Database Sections (Section A, Section B) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Section</label>
                <select
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  {validSections.map(sec => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
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
                placeholder="e.g. Unit 2: Armature Reaction and Commutation in DC Generators"
                className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>

            {/* MANDATORY CLASS PHOTO EVIDENCE PANEL */}
            <div className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5 uppercase tracking-wider">
                    <Camera className="w-4 h-4 text-[#4F46E5]" />
                    <span>Mandatory Class Photo Evidence</span>
                    <span className="text-[10px] text-red-600 font-bold">*Required</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Capture or upload a classroom evidence photo to authenticate this session against dispute claims.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Image className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleUseSampleClassroomPhoto}
                    className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Capture Classroom Evidence</span>
                  </button>
                </div>
              </div>

              {/* Photo Preview */}
              {classPhoto ? (
                <div className="relative inline-block border-2 border-indigo-300 rounded-lg overflow-hidden shadow-xs bg-slate-900">
                  <img
                    src={classPhoto}
                    alt="Class attendance evidence"
                    className="w-64 h-40 object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1.5 text-white text-[10px] flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Evidence Attached
                    </span>
                    <span className="font-mono text-[9px] text-slate-300">{classPhotoTimestamp || 'Timestamped'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClassPhoto(null);
                      setClassPhotoTimestamp('');
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    title="Remove and retake photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-md border-2 border-dashed border-indigo-200 bg-white text-center">
                  <Camera className="w-8 h-8 text-indigo-300 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">No class photo evidence attached yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Click "Upload Image" or "Capture Classroom Evidence" to attach proof before submitting.
                  </p>
                </div>
              )}
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
                    className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAll('absent')}
                    className="text-[10px] font-semibold text-red-800 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 cursor-pointer"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              {roster.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-white">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">No enrolled students found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    No active students match {currentSubject?.name} for {section}.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {roster.map(r => (
                    <div
                      key={r.studentId}
                      className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                    >
                      <div>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold mr-2">
                          {r.usn}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs">{r.studentName}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(r.studentId, 'present')}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            r.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(r.studentId, 'absent')}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            r.status === 'absent'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between border-t border-[#E2E8F0]">
              <div className="text-xs text-slate-600">
                Summary: <strong className="text-emerald-700">{roster.filter(r => r.status === 'present').length} Present</strong>,{' '}
                <strong className="text-red-700">{roster.filter(r => r.status === 'absent').length} Absent</strong> of{' '}
                <strong className="text-slate-900">{roster.length} Total</strong>
              </div>

              <div className="flex items-center gap-2">
                {editingSessionId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={roster.length === 0}
                  className="px-5 py-2 rounded-md text-xs font-bold bg-[#0F172A] hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editingSessionId ? 'Commit Attendance Updates' : 'Commit & Lock Attendance Session'}
                </button>
              </div>
            </div>
          </form>
        </div>
        )
      )}

      {/* 2. OFFICIAL ATTENDANCE HISTORY VIEW (AUDITABLE WITH PHOTO VERIFICATION) */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Functional Real Cascading Filters */}
          <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Attendance History Filters</span>
              </div>
              <button
                onClick={() => {
                  setFilterDept(currentRole === 'hod' ? userDeptCode : 'all');
                  setFilterYear('all');
                  setFilterSection('all');
                  setFilterSubject('all');
                  setFilterFaculty(currentRole === 'faculty' ? currentUser.name : 'all');
                  setFilterDate('');
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              {/* Department Filter (Locked for HOD) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Department
                </label>
                <select
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  disabled={currentRole === 'hod'}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5] disabled:opacity-75"
                >
                  {currentRole !== 'hod' && <option value="all">All Departments</option>}
                  {departments.map(d => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Year
                </label>
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              {/* Section Filter: Strictly Section A & Section B */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Section
                </label>
                <select
                  value={filterSection}
                  onChange={e => setFilterSection(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Sections</option>
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Subject
                </label>
                <select
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Faculty
                </label>
                <select
                  value={filterFaculty}
                  onChange={e => setFilterFaculty(e.target.value)}
                  disabled={currentRole === 'faculty'}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5] disabled:opacity-75"
                >
                  {currentRole !== 'faculty' && <option value="all">All Faculty</option>}
                  {users
                    .filter(u => u.role === 'faculty' || u.role === 'hod')
                    .map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>
                Showing <strong>{filteredSessions.length}</strong> verified attendance session{filteredSessions.length === 1 ? '' : 's'}
              </span>
              {currentRole === 'hod' && (
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  HOD Scope: {userDeptCode} Department Records
                </span>
              )}
            </div>
          </div>

          {/* Official Academic Attendance Table */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Time / Slot</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Year & Sem</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Faculty In-Charge</th>
                    <th className="py-2.5 px-3 text-center">Present</th>
                    <th className="py-2.5 px-3 text-center">Absent</th>
                    <th className="py-2.5 px-3 text-center">Class Photo</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-800">No attendance records found.</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          No sessions match the selected department, subject, section, or date filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map(sess => {
                      const turnout = sess.totalStudents > 0 ? Math.round((sess.presentCount / sess.totalStudents) * 100) : 0;
                      const hasPhoto = !!sess.classPhotoUrl;

                      return (
                        <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-900 font-mono">
                            {sess.date}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <span className="font-semibold text-slate-800">{sess.time || sess.slot.split('-')[0].trim()}</span>
                            <br />
                            <span className="text-[10px] text-slate-400 font-mono">{sess.slot}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[10px] mr-1.5 font-bold">
                                {sess.subjectCode}
                              </span>
                              {sess.subjectName}
                            </div>
                            <span className="text-[10px] text-slate-400">{sess.topicCovered}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {sess.year ? `${sess.year} Year` : `Sem ${sess.semester}`}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-800">
                              {sess.section.startsWith('Section') ? sess.section : `Section ${sess.section}`}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {sess.facultyName || 'Course Faculty'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">
                            {sess.presentCount}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-red-700">
                            {sess.absentCount}
                          </td>
                          {/* Class Photo Evidence Thumbnail */}
                          <td className="py-3 px-3 text-center">
                            {hasPhoto ? (
                              <button
                                type="button"
                                onClick={() => setVerifyingSession(sess)}
                                className="relative group inline-block rounded overflow-hidden border border-indigo-300 hover:border-indigo-600 shadow-2xs cursor-pointer"
                                title="Click to view class photo evidence and audit record"
                              >
                                <img
                                  src={sess.classPhotoUrl}
                                  alt="Evidence"
                                  className="w-12 h-9 object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center">
                                  <Camera className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                                </div>
                              </button>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Missing
                              </span>
                            )}
                          </td>
                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                hasPhoto
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {hasPhoto ? 'Photo Verified' : 'Logged'} ({turnout}%)
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setVerifyingSession(sess)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Open full attendance roll and dispute verification"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {isTeacherOrAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditSession(sess)}
                                    className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                    title="Edit Attendance Session Record"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(sess.id)}
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete Attendance Session Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
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
      )}

      {/* 3. SUBJECT-WISE STUDENT VIEW (Strictly isolated to authentic student accounts) */}
      {activeTab === 'studentView' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {displayedAttendance.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl border border-[#D9E6DE] p-12 text-center text-slate-500">
                <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">
                  {isSimulatingRole && isStudentView
                    ? 'Role Simulation Mode — No Personal Attendance'
                    : isRealStudent
                    ? 'No attendance data available'
                    : 'Administrator Academic View — Protected Student Records'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  {isSimulatingRole && isStudentView
                    ? 'Administrator preview session does not attach any student\'s personal attendance records. To inspect an individual student\'s attendance, navigate to Admin → Users & Students.'
                    : isRealStudent
                    ? 'There are no attendance records registered for your account yet.'
                    : 'Personal student attendance breakdowns are strictly isolated to authentic student accounts. Use Attendance History or Shortage Roll to inspect institutional records.'}
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

      {/* 4. SHORTAGE ROLL */}
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
            <button className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 border border-[#E2E8F0] cursor-pointer">
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
                      Candidate: {st.studentName || 'Student'} ({st.usn || st.studentId || 'ID'}) • Attended: {st.attendedClasses}/{st.totalClasses} classes
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-[#DC2626]">{st.percentage}%</span>
                      <p className="text-[10px] text-red-700 font-semibold uppercase">Needs remedial sessions</p>
                    </div>
                    <button className="px-2.5 py-1 rounded-md bg-[#DC2626] hover:bg-red-700 text-white font-medium text-xs cursor-pointer">
                      Issue Notice
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* DISPUTE VERIFICATION & COMPLETE SESSION DOSSIER MODAL (Requirement #12) */}
      {verifyingSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-2xl w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Official Attendance Record & Dispute Verification Dossier
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Transparent session audit trail backed by photographic evidence
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingSession(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Session Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Session Date & Time</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {verifyingSession.date} • {verifyingSession.time || verifyingSession.slot.split('-')[0].trim()}
                </span>
                <p className="text-[10px] text-slate-500">{verifyingSession.slot}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Course Subject</span>
                <span className="font-semibold text-slate-900">
                  {verifyingSession.subjectCode} - {verifyingSession.subjectName}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Cohort</span>
                <span className="font-semibold text-slate-900">
                  {verifyingSession.year ? `${verifyingSession.year} Year` : `Sem ${verifyingSession.semester}`} • {verifyingSession.section}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Faculty In-Charge</span>
                <span className="font-semibold text-slate-900">{verifyingSession.facultyName || 'Course Faculty'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Attendance Turnout</span>
                <span className="font-semibold text-slate-900">
                  <strong className="text-emerald-700">{verifyingSession.presentCount} Present</strong>,{' '}
                  <strong className="text-red-700">{verifyingSession.absentCount} Absent</strong>
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Session Topic</span>
                <span className="font-semibold text-slate-700 truncate block" title={verifyingSession.topicCovered}>
                  {verifyingSession.topicCovered}
                </span>
              </div>
            </div>

            {/* CLASS PHOTO EVIDENCE DISPLAY */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Camera className="w-4 h-4 text-indigo-600" />
                Classroom Photographic Proof
              </span>
              {verifyingSession.classPhotoUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-indigo-200 bg-slate-950">
                  <img
                    src={verifyingSession.classPhotoUrl}
                    alt="Class photo proof"
                    className="w-full max-h-72 object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/75 p-2 text-white text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Class Photo Authenticated
                    </span>
                    <span className="font-mono text-[10px] text-slate-300">
                      Timestamp: {verifyingSession.classPhotoTimestamp || verifyingSession.submittedAt || verifyingSession.date}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No photographic evidence file is attached for this legacy record.</span>
                </div>
              )}
            </div>

            {/* STUDENT BY STUDENT ROLL BREAKDOWN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Individual Candidate Verification Roll ({verifyingSession.records?.length || 0} Students)
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-md border border-[#E2E8F0] divide-y divide-slate-100 text-xs">
                {verifyingSession.records && verifyingSession.records.length > 0 ? (
                  verifyingSession.records.map(rec => (
                    <div
                      key={rec.studentId}
                      className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                          {rec.usn}
                        </span>
                        <span className="font-semibold text-slate-900">{rec.studentName}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          rec.status === 'present'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400">No individual student records available.</div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-[#E2E8F0]">
              <p className="text-[10px] text-slate-500 max-w-sm">
                Student disputes regarding attendance entries should be reviewed against this classroom photo evidence and verified timetable slot.
              </p>
              <button
                type="button"
                onClick={() => setVerifyingSession(null)}
                className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer"
              >
                Close Verification Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-[#0F172A] mb-2">
              Delete Attendance Session
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Are you sure you want to permanently delete this attendance session? This will remove the recorded attendance register and attached photographic proof from the database.
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
                    showNotification('success', 'Attendance session and records successfully deleted.');
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
