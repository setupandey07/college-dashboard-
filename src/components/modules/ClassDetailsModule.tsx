import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  GraduationCap,
  Building2,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  BarChart3,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  FileText
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { AcademicSection } from '../../services/firestore/sections';
import { DepartmentInfo, Subject, UserProfile } from '../../types';
import {
  ClassTimetable,
  TimetableCell,
  TimetableDay,
  TIMETABLE_DAYS,
  DEFAULT_TIMETABLE_SLOTS,
  TimetableSlotConfig,
  subscribeTimetable
} from '../../services/firestore/timetables';
import { sortStudentsByRollNumber } from '../../lib/academicSort';

interface ClassDetailsModuleProps {
  section: AcademicSection;
  department: DepartmentInfo;
  onBack: () => void;
  onOpenSyllabusForSubject?: (subjectId: string) => void;
}

export const ClassDetailsModule: React.FC<ClassDetailsModuleProps> = ({
  section,
  department,
  onBack,
  onOpenSyllabusForSubject
}) => {
  const { currentRole } = useAuth();
  const {
    subjects,
    users,
    students,
    attendanceSessions,
    studentAttendance,
    announcements,
    updateSection,
    createSubject,
    updateSubject,
    deleteSubject,
    updateTimetableSlot,
    assignLabTimetableSlots
  } = useAcademicData();

  const isAdmin = currentRole === 'admin';
  const isHod = currentRole === 'hod';
  const canEdit = isAdmin || isHod;

  // Active Tab: 'timetable' | 'subjects' | 'students' | 'attendance' | 'notices'
  const [activeTab, setActiveTab] = useState<'timetable' | 'subjects' | 'students' | 'attendance' | 'notices'>('timetable');

  // Timetable State
  const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<{ day: TimetableDay; slot: TimetableSlotConfig } | null>(null);
  const [selectedSubjectIdForSlot, setSelectedSubjectIdForSlot] = useState<string>('');
  const [slotRoomOverride, setSlotRoomOverride] = useState<string>('');
  const [isLabSessionMode, setIsLabSessionMode] = useState<boolean>(false);

  // Class Metadata Editing State
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editRoom, setEditRoom] = useState(section.roomNumber || '');
  const [editCapacity, setEditCapacity] = useState(String(section.capacity || 60));
  const [editTeacherId, setEditTeacherId] = useState(section.classTeacherId || '');

  // Add/Edit Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subCredits, setSubCredits] = useState<number>(4);
  const [subType, setSubType] = useState<'theory' | 'lab' | 'integrated'>('theory');
  const [subFacultyId, setSubFacultyId] = useState('');
  const [subDescription, setSubDescription] = useState('');

  // Notification State
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Subscribe to real-time timetable for this specific section
  useEffect(() => {
    const unsub = subscribeTimetable(
      section.id,
      (tt) => setTimetable(tt),
      (err) => console.warn('Timetable subscription error:', err)
    );
    return () => unsub();
  }, [section.id]);

  // 2. Strict Department & Class Isolation for Subjects
  // Only subjects belonging to this department and assigned to this specific class / academic year / section
  const classSubjects = subjects.filter(sub => {
    const matchDept =
      sub.department?.toLowerCase() === department.name.toLowerCase() ||
      sub.department?.toLowerCase() === department.code.toLowerCase() ||
      (sub as any).departmentCode?.toLowerCase() === department.code.toLowerCase();

    if (!matchDept) return false;

    // Explicit classroom match: if classId matches, it's definitively for this classroom
    if (sub.classId && sub.classId === section.id) return true;

    // Strict year match
    const subYearNum = sub.year || (sub.semester ? Math.ceil(sub.semester / 2) : undefined);
    const matchYear = subYearNum === section.yearNumber;

    // Strict section match: Section A must NEVER show Section B subjects!
    const normSubSec = (sub.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
    const normClassSec = section.sectionName.replace(/^Section\s+/i, '').trim().toUpperCase();
    const matchSec = normSubSec === normClassSec;

    return matchYear && matchSec;
  });

  // Department faculty users
  const deptFacultyUsers = users.filter(
    u =>
      (u.role === 'faculty' || u.role === 'hod') &&
      (u.departmentCode?.toLowerCase() === department.code.toLowerCase() ||
       u.department?.toLowerCase() === department.name.toLowerCase())
  );

  // Enrolled students belonging to this department and class/section (strictly sorted by Roll Number)
  const enrolledStudents = React.useMemo(() => {
    const normClassSec = section.sectionName.replace(/^Section\s+/i, '').trim().toUpperCase();
    const deptCodeUpper = department.code.toUpperCase().trim();
    const deptNameLower = department.name.toLowerCase().trim();

    const matchingStudents = students.filter(s => {
      const matchDept =
        s.departmentName?.toLowerCase().includes(deptNameLower) ||
        s.departmentId?.toUpperCase().includes(deptCodeUpper) ||
        s.departmentName?.toUpperCase().includes(deptCodeUpper);
      const matchYear = s.year === section.yearNumber;
      const sSec = (s.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
      const matchSec = sSec === normClassSec;
      return matchDept && matchYear && matchSec && s.status === 'active';
    });

    const matchingUsers = users.filter(u => {
      if (u.role !== 'student' || u.status !== 'active') return false;
      const already = matchingStudents.some(s => s.userId === u.id || s.email === u.email);
      if (already) return false;
      const uDeptCode = (u.departmentCode || '').toUpperCase().trim();
      const uDeptName = (u.department || '').toLowerCase().trim();
      const matchDept = uDeptCode === deptCodeUpper || uDeptName === deptNameLower;
      const uYear = u.semester ? Math.ceil(u.semester / 2) : 0;
      const matchYear = uYear === section.yearNumber;
      const uSec = (u.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
      const matchSec = uSec === normClassSec;
      return matchDept && matchYear && matchSec;
    });

    const combined = [
      ...matchingStudents,
      ...matchingUsers.map(u => ({
        id: u.id,
        userId: u.id,
        name: u.name,
        email: u.email,
        rollNumber: u.regId,
        registrationNumber: u.regId,
        departmentId: u.departmentCode || department.code,
        departmentName: u.department || department.name,
        year: section.yearNumber,
        semester: section.yearNumber * 2,
        section: section.sectionName,
        admissionYear: u.admissionYear || 2024,
        phone: u.phone || '',
        status: 'active' as const
      }))
    ];

    return sortStudentsByRollNumber(combined);
  }, [students, users, department, section]);

  // Calculate Class Strength
  const enrolledCount = enrolledStudents.length;
  const classCapacity = section.capacity || 60;

  // Department / Class Notices
  const classNotices = announcements.filter(a =>
    a.department?.toLowerCase() === department.name.toLowerCase() ||
    a.department?.toLowerCase() === department.code.toLowerCase() ||
    !a.department ||
    a.department === 'All'
  );

  // Calculate Overall Class Attendance
  const classSubjectIds = new Set(classSubjects.map(s => s.id));
  const classAttSessions = attendanceSessions.filter(
    sess => classSubjectIds.has(sess.subjectId) ||
            (sess.section === section.sectionName || sess.section === section.sectionName.replace('Section ', '').trim())
  );
  const avgClassAttendance = classAttSessions.length > 0
    ? Math.round(
        classAttSessions.reduce((acc, s) => acc + (s.totalStudents > 0 ? (s.presentCount / s.totalStudents) * 100 : 0), 0) /
          classAttSessions.length
      )
    : 0;

  // Active slots configuration from database or defaults
  const activeSlots: TimetableSlotConfig[] =
    timetable?.slotsConfig && timetable.slotsConfig.length > 0
      ? timetable.slotsConfig
      : DEFAULT_TIMETABLE_SLOTS;

  // Handle Class Metadata Update
  const handleSaveMetadata = async () => {
    setIsSubmitting(true);
    try {
      const teacher = users.find(u => u.id === editTeacherId);
      await updateSection(section.id, {
        roomNumber: editRoom.trim(),
        capacity: Number(editCapacity) || 60,
        classTeacherId: editTeacherId || undefined,
        classTeacherName: teacher ? teacher.name : undefined
      });
      showNotification('success', 'Class metadata updated successfully.');
      setIsEditingMetadata(false);
    } catch (e: any) {
      showNotification('error', e?.message || 'Failed to update class details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Subject Modal
  const openSubjectModal = (sub?: Subject) => {
    if (sub) {
      setEditingSubject(sub);
      setSubName(sub.name);
      setSubCode(sub.code);
      setSubCredits(sub.credits);
      setSubType(sub.type || 'theory');
      setSubFacultyId(sub.facultyId || '');
      setSubDescription(sub.description || '');
    } else {
      setEditingSubject(null);
      setSubName('');
      setSubCode('');
      setSubCredits(4);
      setSubType('theory');
      setSubFacultyId(deptFacultyUsers[0]?.id || '');
      setSubDescription('');
    }
    setIsSubjectModalOpen(true);
  };

  // Save Subject
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCode.trim() || !subName.trim()) {
      showNotification('error', 'Subject code and title are required.');
      return;
    }

    const assignedTeacher = users.find(u => u.id === subFacultyId);
    setIsSubmitting(true);
    try {
      const subjectPayload: Subject = {
        id: editingSubject?.id || `sub-${department.code.toLowerCase()}-${subCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        code: subCode.trim().toUpperCase(),
        name: subName.trim(),
        department: department.name,
        departmentCode: department.code,
        year: section.yearNumber,
        semester: section.yearNumber * 2, // Standard mapping
        section: section.sectionName,
        classId: section.id,
        credits: Number(subCredits) || 4,
        type: subType,
        facultyId: subFacultyId || '',
        facultyName: assignedTeacher ? assignedTeacher.name : 'Unassigned',
        description: subDescription.trim(),
        totalHoursPlanned: Number(subCredits) * 12,
        hoursConducted: editingSubject?.hoursConducted || 0,
        units: editingSubject?.units || [
          {
            id: 'u1',
            unitNumber: 1,
            title: 'Foundations & Core Principles',
            plannedHours: 5,
            completedHours: 0,
            isCompleted: false,
            topics: [
              { id: 't1', title: 'Introduction & Scope', hours: 2, completed: false },
              { id: 't2', title: 'Fundamental Theorems', hours: 3, completed: false }
            ]
          }
        ],
        status: editingSubject?.status || 'on_track'
      };

      if (editingSubject) {
        await updateSubject(editingSubject.id, subjectPayload);
        showNotification('success', `Subject ${subjectPayload.code} updated.`);
      } else {
        await createSubject(subjectPayload);
        showNotification('success', `Subject ${subjectPayload.code} created and assigned to ${section.sectionName}.`);
      }
      setIsSubjectModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Timetable Slot Assignment
  const handleSaveSlotAssignment = async () => {
    if (!selectedSlotForEdit) return;
    setIsSubmitting(true);
    try {
      if (!selectedSubjectIdForSlot) {
        // Clear slot - if part of a lab session, automatically releases all 3 consecutive slots
        const existingCell = timetable?.schedule?.[selectedSlotForEdit.day]?.[selectedSlotForEdit.slot.id];
        await updateTimetableSlot(
          section.id,
          department.code,
          section.academicYear,
          section.sectionName,
          selectedSlotForEdit.day,
          selectedSlotForEdit.slot.id,
          null
        );
        if (existingCell?.labGroupId) {
          showNotification('success', `Released 3-period Lab practical session (${existingCell.subjectCode}).`);
        } else {
          showNotification('success', `Slot ${selectedSlotForEdit.day} ${selectedSlotForEdit.slot.timeRange} cleared.`);
        }
      } else {
        const sub = classSubjects.find(s => s.id === selectedSubjectIdForSlot);
        if (!sub) {
          showNotification('error', 'Selected subject is not available for this class.');
          return;
        }

        const isLab = isLabSessionMode || sub.type === 'lab';

        const cell: TimetableCell = {
          subjectId: sub.id,
          subjectCode: sub.code, // Displays ONLY the subject code in timetable cell
          subjectName: sub.name,
          facultyId: sub.facultyId,
          facultyName: sub.facultyName,
          roomNumber: slotRoomOverride.trim() || section.roomNumber || (isLab ? 'Lab 101' : 'Room 101'),
          type: isLab ? 'lab' : sub.type,
          credits: sub.credits
        };

        if (isLab) {
          // Lab occupies 3 consecutive slots starting at p1, p2, or p5
          const validLabStarts = ['p1', 'p2', 'p5'];
          if (!validLabStarts.includes(selectedSlotForEdit.slot.id)) {
            showNotification(
              'error',
              'A 3-slot Lab must begin at Period 1 (9:00 AM), Period 2 (10:00 AM), or Period 5 (2:00 PM) to occupy 3 consecutive class periods.'
            );
            setIsSubmitting(false);
            return;
          }

          const res = await assignLabTimetableSlots(
            section.id,
            department.code,
            section.academicYear,
            section.sectionName,
            selectedSlotForEdit.day,
            selectedSlotForEdit.slot.id,
            cell
          );
          showNotification(
            'success',
            `Assigned 3-slot Lab for ${sub.code} on ${selectedSlotForEdit.day} (${res.affectedSlotIds.map(s => s.toUpperCase()).join(', ')}).`
          );
        } else {
          await updateTimetableSlot(
            section.id,
            department.code,
            section.academicYear,
            section.sectionName,
            selectedSlotForEdit.day,
            selectedSlotForEdit.slot.id,
            cell
          );
          showNotification('success', `Assigned ${sub.code} to ${selectedSlotForEdit.day} ${selectedSlotForEdit.slot.timeRange}.`);
        }
      }
      setSelectedSlotForEdit(null);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to update timetable slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Breadcrumb & Header Card */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mb-2 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to {department.code} Department & Classes
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[#4F46E5] font-black text-xs">
                {department.code}
              </span>
              <span className="text-slate-300">/</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs">
                {section.academicYear}
              </span>
              <span className="text-slate-300">/</span>
              <h1 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                {section.sectionName}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Class
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              {department.name} • Academic Year {section.academicYear} • Class Management Portal
            </p>
          </div>

          {/* Quick Details Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Classroom</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                {section.roomNumber || 'Not Allocated'}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Class Coordinator</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                {section.classTeacherName || 'Not Assigned'}
              </span>
            </div>
            {canEdit && (
              <button
                onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                className="px-2.5 py-1.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer ml-auto"
              >
                <Edit2 className="w-3 h-3 text-indigo-600" />
                {isEditingMetadata ? 'Cancel Edit' : 'Edit Class Info'}
              </button>
            )}
          </div>
        </div>

        {/* Inline Metadata Edit Drawer */}
        {isEditingMetadata && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Classroom / Room Number</label>
              <input
                type="text"
                value={editRoom}
                onChange={e => setEditRoom(e.target.value)}
                placeholder="e.g. EE-204"
                className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Class Capacity</label>
              <input
                type="number"
                value={editCapacity}
                onChange={e => setEditCapacity(e.target.value)}
                min="10"
                max="120"
                className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Class Teacher / Coordinator</label>
              <select
                value={editTeacherId}
                onChange={e => setEditTeacherId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- Select Faculty Coordinator --</option>
                {deptFacultyUsers.map(fac => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.departmentCode || department.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingMetadata(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMetadata}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs bg-[#0F172A] hover:bg-slate-800 text-white font-semibold rounded shadow-xs cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quantitative KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Class Strength</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-[#0F172A]">{enrolledCount}</span>
            <span className="text-xs text-slate-400">/ {classCapacity}</span>
          </div>
          <span className="text-[10px] text-slate-500">Enrolled students</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Subjects</span>
          <span className="text-xl font-bold text-indigo-700 mt-0.5 block">{classSubjects.length}</span>
          <span className="text-[10px] text-slate-500">Curriculum courses</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faculty Assigned</span>
          <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">
            {new Set(classSubjects.map(s => s.facultyId).filter(Boolean)).size}
          </span>
          <span className="text-[10px] text-slate-500">Subject teachers</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Attendance Avg</span>
          <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
            {classAttSessions.length > 0 ? `${avgClassAttendance}%` : 'N/A'}
          </span>
          <span className="text-[10px] text-slate-500">{classAttSessions.length} sessions logged</span>
        </div>
      </div>

      {/* Navigation Tabs Header */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-4 py-2 rounded-md font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'timetable'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          Timetable (Mon–Fri)
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 rounded-md font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'subjects'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          Subjects & Syllabus ({classSubjects.length})
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-md font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'students'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          Students Roster ({enrolledCount})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-md font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'attendance'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          Attendance Breakdown
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`px-4 py-2 rounded-md font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'notices'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 text-purple-400" />
          Class Circulars ({classNotices.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MONDAY–FRIDAY TABULAR TIMETABLE                   */}
      {/* ======================================================== */}
      {activeTab === 'timetable' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                  Official Class Timetable — {section.academicYear} ({section.sectionName})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Working Schedule: 9:00 AM – 1:00 PM (4 × 50m Periods) • 2:00 PM – 5:00 PM (3 × 50m Periods)
              </p>
            </div>

            {canEdit && (
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                💡 Click any period slot to assign or reallocate subject
              </span>
            )}
          </div>

          {/* Timetable Matrix Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs min-w-[850px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-3 text-left w-28 uppercase tracking-wider">Day</th>
                  {activeSlots.map(slot => (
                    <th
                      key={slot.id}
                      className={`py-2 px-2 border-l border-slate-200 text-center ${
                        slot.isBreak || slot.isBuffer ? 'bg-amber-50/60 text-amber-900 w-24' : 'min-w-[90px]'
                      }`}
                    >
                      <span className="font-bold block">{slot.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal font-mono block mt-0.5">
                        {slot.timeRange}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TIMETABLE_DAYS.map(day => (
                  <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                    {/* Day Column */}
                    <td className="py-3.5 px-3 text-left font-bold text-[#0F172A] bg-slate-50/40">
                      {day}
                    </td>

                    {/* Periods / Slots */}
                    {activeSlots.map(slot => {
                      if (slot.isBreak) {
                        return (
                          <td
                            key={slot.id}
                            className="py-2 px-2 border-l border-slate-200 bg-amber-50/40 text-[10px] font-bold text-amber-800 uppercase tracking-wider"
                          >
                            Lunch Break
                          </td>
                        );
                      }

                      if (slot.isBuffer) {
                        return (
                          <td
                            key={slot.id}
                            className="py-2 px-2 border-l border-slate-200 bg-slate-50 text-[10px] text-slate-400"
                          >
                            Buffer / Sports
                          </td>
                        );
                      }

                      const cell = timetable?.schedule?.[day]?.[slot.id];

                      return (
                        <td
                          key={slot.id}
                          onClick={() => {
                            if (canEdit) {
                              setSelectedSlotForEdit({ day, slot });
                              setSelectedSubjectIdForSlot(cell?.subjectId || '');
                              setSlotRoomOverride(cell?.roomNumber || section.roomNumber || '');
                              setIsLabSessionMode(Boolean(cell?.isLabSession || cell?.type === 'lab'));
                            }
                          }}
                          className={`py-2.5 px-2 border-l border-slate-100 transition-all ${
                            canEdit ? 'cursor-pointer hover:bg-indigo-50/60' : ''
                          }`}
                        >
                          {cell ? (
                            /* Timetable Cell: Displays Subject Code and 3-slot Lab indicator if lab */
                            <div
                              className={`p-2 rounded border transition-all text-center group relative ${
                                cell.isLabSession || cell.type === 'lab'
                                  ? 'bg-amber-50/90 border-amber-300 text-amber-950 ring-1 ring-amber-200/50'
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                              }`}
                              title={`${cell.subjectName} • ${cell.facultyName || 'No Faculty'} • ${cell.roomNumber || 'Room N/A'}`}
                            >
                              {(cell.isLabSession || cell.type === 'lab') && (
                                <span className="inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-200/90 text-amber-950 border border-amber-300/80 mb-0.5">
                                  🔬 Lab {cell.labSlotIndex !== undefined ? `(${cell.labSlotIndex + 1}/3)` : ''}
                                </span>
                              )}
                              <span className="font-mono font-black text-xs block text-[#0F172A] tracking-wide">
                                {cell.subjectCode}
                              </span>

                              <span className="text-[10px] text-slate-500 block truncate mt-0.5 font-medium">
                                {cell.roomNumber || section.roomNumber || 'R-TBD'}
                              </span>

                              {/* Hover Tooltip Card */}
                              <div className="hidden group-hover:block absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900 text-white rounded-md shadow-lg text-[10px] text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-amber-300">{cell.subjectCode}</p>
                                  {(cell.isLabSession || cell.type === 'lab') && (
                                    <span className="text-[9px] bg-amber-400 text-slate-950 px-1 font-bold rounded">
                                      3-Slot Lab
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-slate-200 line-clamp-2 mt-0.5">{cell.subjectName}</p>
                                <div className="mt-1 pt-1 border-t border-slate-700 text-slate-400 space-y-0.5">
                                  <p>Faculty: <span className="text-white">{cell.facultyName || 'Unassigned'}</span></p>
                                  <p>Room: <span className="text-white">{cell.roomNumber || section.roomNumber || 'N/A'}</span></p>
                                  <p>Type: <span className="capitalize text-white">{cell.type || 'Theory'}</span></p>
                                  {cell.isLabSession && (
                                    <p className="text-amber-300 font-semibold">Slot {((cell.labSlotIndex ?? 0) + 1)} of 3-slot continuous session</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Empty Slot */
                            <div className="py-3 text-[11px] text-slate-300 hover:text-indigo-600 border border-dashed border-transparent hover:border-indigo-300 rounded transition-colors">
                              {canEdit ? '+ Slot' : '—'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SUBJECTS FOR THE CLASS & SYLLABUS INTEGRATION     */}
      {/* ======================================================== */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                Curriculum Subjects for {section.academicYear} — {section.sectionName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage course subjects, faculty allocations, and link directly to syllabus topics
              </p>
            </div>

            {canEdit && (
              <button
                onClick={() => openSubjectModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                Add Subject to Class
              </button>
            )}
          </div>

          {classSubjects.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center shadow-xs">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#0F172A]">No Subjects Assigned to this Class Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Before setting up the weekly timetable, add the actual academic subjects (e.g. DC Machines, Electromagnetic Fields) belonging to {department.code} {section.academicYear}.
              </p>
              {canEdit && (
                <button
                  onClick={() => openSubjectModal()}
                  className="px-4 py-2 rounded bg-[#0F172A] text-white font-semibold text-xs shadow-xs cursor-pointer"
                >
                  + Add First Subject
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {classSubjects.map(sub => {
                const completedTopics = (sub.units || []).reduce(
                  (acc, u) => acc + (u.topics ? u.topics.filter(t => t.completed).length : 0),
                  0
                );
                const totalTopics = (sub.units || []).reduce(
                  (acc, u) => acc + (u.topics ? u.topics.length : 0),
                  0
                );
                const coveragePct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-lg border border-[#E2E8F0] p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                          {sub.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            sub.type === 'lab'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-indigo-50 text-[#4F46E5] border border-indigo-200'
                          }`}
                        >
                          {sub.type || 'Theory'} • {sub.credits} Credits
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#0F172A] mt-2 line-clamp-1">
                        {sub.name}
                      </h3>

                      {sub.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {sub.description}
                        </p>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-slate-500">Faculty:</span>
                          <strong className="text-slate-800 truncate">{sub.facultyName || 'Unassigned'}</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-500">Curriculum:</span>
                          <span>{sub.units?.length || 0} Units • {totalTopics} Topics</span>
                        </div>
                      </div>

                      {/* Topic Coverage Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500 font-semibold">Syllabus Progress</span>
                          <span className="font-mono font-bold text-indigo-700">{coveragePct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${coveragePct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer: Direct Link to Existing Syllabus Builder (Requirement 3) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          if (onOpenSyllabusForSubject) {
                            onOpenSyllabusForSubject(sub.id);
                          } else {
                            showNotification('success', `Opening syllabus for ${sub.code}...`);
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-xs font-bold transition-all cursor-pointer"
                        title="Open existing Syllabus Builder to edit units and topics"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Edit Syllabus
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openSubjectModal(sub)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete subject ${sub.code}: ${sub.name}?`)) {
                                deleteSubject(sub.id);
                                showNotification('success', `Subject ${sub.code} deleted.`);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ENROLLED STUDENTS ROSTER                          */}
      {/* ======================================================== */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4F46E5]" />
                Enrolled Students — {section.sectionName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official candidate roster allocated to {department.code} {section.academicYear}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {enrolledCount} Candidates
            </span>
          </div>

          {enrolledCount === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No students currently assigned to this class section.</p>
              <p className="text-slate-400 mt-1">Students enrolled in {department.code} {section.academicYear} will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-slate-600 uppercase">
                    <th className="py-3 px-4">Roll / USN</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4 text-center">Batch / Year</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrolledStudents.map(stu => (
                    <tr key={stu.id || stu.userId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                        {stu.rollNumber || stu.registrationNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {stu.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {stu.email}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        Batch {stu.admissionYear || 2024}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: ATTENDANCE SUMMARY BREAKDOWN                      */}
      {/* ======================================================== */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#4F46E5]" />
                Class Attendance Summary — {section.sectionName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregate lecture logs and subject-level student participation
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-700">{avgClassAttendance}%</span>
              <span className="text-[10px] text-slate-400 block uppercase">Overall Attendance</span>
            </div>
          </div>

          {classAttSessions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No attendance sessions recorded yet for this class.</p>
              <p className="text-slate-400 mt-1">When course faculty take attendance in Attendance Module, statistics will sync here live.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classSubjects.map(sub => {
                const subSessions = classAttSessions.filter(sess => sess.subjectId === sub.id || sess.subjectCode === sub.code);
                const subAvg = subSessions.length > 0
                  ? Math.round(
                      subSessions.reduce((acc, s) => acc + (s.totalStudents > 0 ? (s.presentCount / s.totalStudents) * 100 : 0), 0) /
                        subSessions.length
                    )
                  : 0;

                return (
                  <div key={sub.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                          {sub.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{sub.name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Teacher: {sub.facultyName || 'Unassigned'} • {subSessions.length} lecture session{subSessions.length === 1 ? '' : 's'} logged
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-base font-bold font-mono ${subAvg >= 75 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {subSessions.length > 0 ? `${subAvg}%` : 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-400 block uppercase">Average</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CLASS NOTICES & CIRCULARS                         */}
      {/* ======================================================== */}
      {activeTab === 'notices' && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#4F46E5]" />
                Notices & Academic Circulars
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official circulars and announcements relevant to {department.code} {section.academicYear}
              </p>
            </div>
          </div>

          {classNotices.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No active circulars published for this department.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classNotices.map(anc => (
                <div key={anc.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{anc.title}</h4>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {anc.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{anc.content}</p>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{anc.date}</span>
                    <span>•</span>
                    <span>Issued by {anc.authorRole}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT SUBJECT MODAL                        */}
      {/* ======================================================== */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#CBD5E1]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingSubject ? `Edit Subject: ${editingSubject.code}` : `Add Subject to ${section.sectionName}`}
                </h3>
              </div>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Subject Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subCode}
                    onChange={e => setSubCode(e.target.value.toUpperCase())}
                    placeholder="e.g. EE301"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded border border-[#CBD5E1] focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Credits <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="6"
                    value={subCredits}
                    onChange={e => setSubCredits(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Subject Title / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  placeholder="e.g. DC Machines & Transformers"
                  className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Course Type</label>
                  <select
                    value={subType}
                    onChange={e => setSubType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="theory">Theory (Lecture)</option>
                    <option value="lab">Laboratory (Practical)</option>
                    <option value="integrated">Integrated (Theory + Lab)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Assigned Faculty</label>
                  <select
                    value={subFacultyId}
                    onChange={e => setSubFacultyId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Select {department.code} Faculty --</option>
                    {deptFacultyUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Course Description / Scope</label>
                <textarea
                  rows={2}
                  value={subDescription}
                  onChange={e => setSubDescription(e.target.value)}
                  placeholder="Electromagnetic induction principles, operating characteristics, and industrial applications..."
                  className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white rounded shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingSubject ? 'Update Subject' : 'Add Subject to Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ASSIGN SUBJECT TO TIMETABLE SLOT                */}
      {/* ======================================================== */}
      {selectedSlotForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-[#CBD5E1]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Timetable Allocation
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedSlotForEdit.day} • {selectedSlotForEdit.slot.label} ({selectedSlotForEdit.slot.timeRange})
                </h3>
              </div>
              <button
                onClick={() => setSelectedSlotForEdit(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(() => {
                const currentCell = selectedSlotForEdit ? timetable?.schedule?.[selectedSlotForEdit.day]?.[selectedSlotForEdit.slot.id] : null;
                return currentCell?.labGroupId ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>🔬</span> Active 3-Slot Lab Practical ({currentCell.subjectCode})
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Period {(currentCell.labSlotIndex ?? 0) + 1} of 3-slot continuous practical session. Clearing or reallocating this slot will update all 3 consecutive periods simultaneously.
                    </p>
                  </div>
                ) : null;
              })()}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Select Course Subject (Only {department.code} — {section.sectionName} Subjects)
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Subjects are strictly isolated to {department.code}.
                </p>

                {classSubjects.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                    No subjects exist for this class yet. Please add subjects first using the "Subjects & Syllabus" tab.
                  </div>
                ) : (
                  <select
                    value={selectedSubjectIdForSlot}
                    onChange={e => {
                      const newSubId = e.target.value;
                      setSelectedSubjectIdForSlot(newSubId);
                      const foundSub = classSubjects.find(s => s.id === newSubId);
                      if (foundSub?.type === 'lab') {
                        setIsLabSessionMode(true);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded border border-[#CBD5E1] bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- No Subject Assigned (Clear Slot) --</option>
                    {classSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} — {sub.name} ({sub.facultyName || 'No Faculty'}) [{sub.type === 'lab' ? 'Lab' : 'Theory'}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedSubjectIdForSlot && (
                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                  <label className="block text-[11px] font-bold text-slate-700">Class Session Type</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className={`p-2 rounded border cursor-pointer flex items-center gap-2 ${!isLabSessionMode ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input
                        type="radio"
                        name="sessionType"
                        checked={!isLabSessionMode}
                        onChange={() => setIsLabSessionMode(false)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Theory (1 Slot)</span>
                    </label>
                    <label className={`p-2 rounded border cursor-pointer flex items-center gap-2 ${isLabSessionMode ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input
                        type="radio"
                        name="sessionType"
                        checked={isLabSessionMode}
                        onChange={() => setIsLabSessionMode(true)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Lab (3 Slots)</span>
                    </label>
                  </div>
                  {isLabSessionMode && (
                    <div className="text-[10px] text-amber-900 bg-amber-100/70 p-2 rounded border border-amber-200 mt-1 leading-relaxed space-y-0.5">
                      <p className="font-bold">🔬 3-Slot Consecutive Lab Practical</p>
                      <p>
                        Automatically reserves this slot and the next 2 consecutive periods. Valid starting slots: Period 1 (9:00 AM), Period 2 (10:00 AM), or Period 5 (2:00 PM).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedSubjectIdForSlot && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Room / Lab Location Override (Optional)
                  </label>
                  <input
                    type="text"
                    value={slotRoomOverride}
                    onChange={e => setSlotRoomOverride(e.target.value)}
                    placeholder={section.roomNumber || (isLabSessionMode ? 'e.g. Lab 204' : 'e.g. Room 101')}
                    className="w-full px-3 py-1.5 text-xs rounded border border-[#CBD5E1] focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Defaults to {section.roomNumber || (isLabSessionMode ? 'Lab 101' : 'Room 101')} if blank.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubjectIdForSlot('');
                    handleSaveSlotAssignment();
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                >
                  Clear Slot
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlotForEdit(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSlotAssignment}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white rounded shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Confirm Allocation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
