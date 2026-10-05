import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Building2,
  Users,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { AcademicSection } from '../../services/firestore/sections';
import { DepartmentInfo } from '../../types';
import { ClassDetailsModule } from './ClassDetailsModule';

interface ClassroomsModuleProps {
  onNavigateToSyllabus?: (subjectId: string) => void;
}

export const ClassroomsModule: React.FC<ClassroomsModuleProps> = ({ onNavigateToSyllabus }) => {
  const { currentRole, currentUser, actualRole } = useAuth();
  const {
    departments,
    sections,
    subjects,
    users,
    students,
    createSection
  } = useAcademicData();

  const isAdmin = currentRole === 'admin';
  const isHod = currentRole === 'hod';
  const isFaculty = currentRole === 'faculty' || currentRole === 'lab_assistant';
  const isStudent = currentRole === 'student';

  const userDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
  const userDeptName = (currentUser?.department || '').toLowerCase().trim();

  // Active Selected Classroom for inspection
  const [activeClassroom, setActiveClassroom] = useState<{ section: AcademicSection; dept: DepartmentInfo } | null>(null);

  // Filters (for Admin & HOD)
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(isHod ? userDeptCode : 'all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');

  // Modal for creating a new classroom (Admin/HOD)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formDeptCode, setFormDeptCode] = useState(isHod ? userDeptCode : (departments[0]?.code || ''));
  const [formAcademicYear, setFormAcademicYear] = useState('2nd Year');
  const [formSectionName, setFormSectionName] = useState('Section A');
  const [formRoomNumber, setFormRoomNumber] = useState('Room 101');
  const [formCapacity, setFormCapacity] = useState<number>(60);
  const [formClassTeacherId, setFormClassTeacherId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to normalize section name
  const normalizeSec = (s?: string) => (s || '').replace(/^Section\s+/i, '').trim().toUpperCase();

  // Authoritative Filtered Classrooms strictly bounded by Role
  const accessibleClassrooms = useMemo(() => {
    // 1. STUDENT: Strictly ONLY their own classroom
    if (isStudent) {
      const stuDeptCode = userDeptCode;
      const stuYear = currentUser?.currentAcademicYear
        ? Number(currentUser.currentAcademicYear.charAt(0))
        : (currentUser?.semester ? Math.ceil(currentUser.semester / 2) : 1);
      const stuSecNorm = normalizeSec(currentUser?.section);

      const matched = sections.filter(sec => {
        const secDeptCode = (sec.departmentCode || '').toUpperCase().trim();
        const secDeptName = (sec.departmentName || '').toLowerCase().trim();
        const matchDept = (stuDeptCode && secDeptCode === stuDeptCode) || (userDeptName && secDeptName === userDeptName);
        const matchYear = sec.yearNumber === stuYear;
        const matchSec = normalizeSec(sec.sectionName) === stuSecNorm;
        return matchDept && matchYear && matchSec && sec.status !== 'inactive';
      });

      // If registered section exists in database, return it
      if (matched.length > 0) return matched;

      // Virtual canonical placeholder if admin has not yet seeded section document
      if (stuDeptCode || userDeptName) {
        const virtualDept = departments.find(d => d.code === stuDeptCode || d.name.toLowerCase() === userDeptName);
        const deptCode = virtualDept ? virtualDept.code : (stuDeptCode || 'DEPT');
        const virtualSec: AcademicSection = {
          id: `sec-${deptCode.toLowerCase()}-${stuYear}yr-${(stuSecNorm || 'A').toLowerCase()}`,
          departmentId: virtualDept?.id || `dept-${deptCode.toLowerCase()}`,
          departmentCode: deptCode,
          departmentName: virtualDept?.name || currentUser?.department,
          academicYear: `${stuYear}${stuYear === 1 ? 'st' : stuYear === 2 ? 'nd' : stuYear === 3 ? 'rd' : 'th'} Year`,
          yearNumber: stuYear,
          sectionName: currentUser?.section ? (currentUser.section.startsWith('Section') ? currentUser.section : `Section ${currentUser.section}`) : 'Section A',
          roomNumber: 'Designated Lecture Hall',
          capacity: 60,
          status: 'active'
        };
        return [virtualSec];
      }
      return [];
    }

    // 2. FACULTY: Strictly ONLY classrooms where they are assigned to teach or class teacher
    if (isFaculty) {
      const assignedSubIds = new Set<string>();
      if (Array.isArray(currentUser?.assignedSubjectIds)) {
        currentUser.assignedSubjectIds.forEach(id => assignedSubIds.add(id));
      }
      if (currentUser?.assignedSubjectId) {
        assignedSubIds.add(currentUser.assignedSubjectId);
      }

      // Find subjects this faculty teaches
      const mySubjects = subjects.filter(
        s => assignedSubIds.has(s.id) || assignedSubIds.has(s.code) || s.facultyId === currentUser?.id
      );

      return sections.filter(sec => {
        if (sec.status === 'inactive') return false;
        // Check if faculty is the class teacher
        if (sec.classTeacherId === currentUser?.id) return true;

        // Check if faculty teaches a subject in this classroom
        const normClassSec = normalizeSec(sec.sectionName);
        const secDeptCode = (sec.departmentCode || '').toUpperCase().trim();

        return mySubjects.some(sub => {
          if (sub.classId && sub.classId === sec.id) return true;
          const subDeptCode = (sub.departmentCode || '').toUpperCase().trim();
          const subDeptName = (sub.department || '').toLowerCase().trim();
          const matchDept = subDeptCode === secDeptCode || (sec.departmentName && subDeptName === sec.departmentName.toLowerCase().trim());
          const subYear = sub.year || (sub.semester ? Math.ceil(sub.semester / 2) : 0);
          const matchYear = subYear === sec.yearNumber;
          const matchSec = normalizeSec(sub.section) === normClassSec;
          return matchDept && matchYear && matchSec;
        });
      });
    }

    // 3. HOD: Strictly ONLY classrooms belonging to their department
    if (isHod) {
      return sections.filter(sec => {
        if (sec.status === 'inactive') return false;
        const secDeptCode = (sec.departmentCode || '').toUpperCase().trim();
        const secDeptName = (sec.departmentName || '').toLowerCase().trim();
        return (userDeptCode && secDeptCode === userDeptCode) || (userDeptName && secDeptName === userDeptName);
      });
    }

    // 4. ADMIN: Global institutional access
    return sections.filter(sec => sec.status !== 'inactive');
  }, [currentRole, currentUser, isStudent, isFaculty, isHod, sections, subjects, departments, userDeptCode, userDeptName]);

  // Apply Search & Filters
  const displayedClassrooms = useMemo(() => {
    return accessibleClassrooms.filter(sec => {
      // Dept filter
      if (selectedDeptFilter !== 'all') {
        const secDept = (sec.departmentCode || '').toUpperCase().trim();
        if (secDept !== selectedDeptFilter.toUpperCase().trim()) return false;
      }
      // Year filter
      if (selectedYearFilter !== 'all') {
        if (sec.yearNumber !== Number(selectedYearFilter)) return false;
      }
      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchSec = sec.sectionName.toLowerCase().includes(query);
        const matchYear = sec.academicYear.toLowerCase().includes(query);
        const matchDept = (sec.departmentCode || '').toLowerCase().includes(query) || (sec.departmentName || '').toLowerCase().includes(query);
        const matchRoom = (sec.roomNumber || '').toLowerCase().includes(query);
        const matchTeacher = (sec.classTeacherName || '').toLowerCase().includes(query);
        if (!matchSec && !matchYear && !matchDept && !matchRoom && !matchTeacher) return false;
      }
      return true;
    });
  }, [accessibleClassrooms, selectedDeptFilter, selectedYearFilter, search]);

  // Open Classroom handler
  const handleOpenClassroom = (sec: AcademicSection) => {
    // Resolve department info
    const secDeptCode = (sec.departmentCode || '').toUpperCase().trim();
    const dept = departments.find(d => d.code.toUpperCase().trim() === secDeptCode) || {
      id: sec.departmentId || `dept-${secDeptCode.toLowerCase()}`,
      code: secDeptCode || 'DEPT',
      name: sec.departmentName || `${secDeptCode} Department`,
      hodName: 'Head of Department',
      hodEmail: '',
      facultyCount: 0,
      studentCount: 0
    };

    setActiveClassroom({ section: sec, dept });
  };

  // Create Classroom Submit (Admin / HOD)
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSectionName.trim()) {
      showNotification('error', 'Section name is required.');
      return;
    }

    const targetDept = departments.find(d => d.code === formDeptCode);
    if (!targetDept) {
      showNotification('error', 'Please select a valid department.');
      return;
    }

    const teacher = users.find(u => u.id === formClassTeacherId);

    setIsSubmitting(true);
    try {
      const yearNum = Number(formAcademicYear.charAt(0)) || 1;
      const created = await createSection({
        departmentId: targetDept.id,
        departmentCode: targetDept.code,
        departmentName: targetDept.name,
        academicYear: formAcademicYear,
        yearNumber: yearNum,
        sectionName: formSectionName.trim(),
        roomNumber: formRoomNumber.trim(),
        capacity: Number(formCapacity) || 60,
        classTeacherId: formClassTeacherId || undefined,
        classTeacherName: teacher ? teacher.name : undefined,
        status: 'active'
      });

      showNotification('success', `Classroom "${created.academicYear} - ${created.sectionName}" created under ${targetDept.code}.`);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to create classroom.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If a classroom is currently opened, display ClassDetailsModule
  if (activeClassroom) {
    return (
      <ClassDetailsModule
        section={activeClassroom.section}
        department={activeClassroom.dept}
        onBack={() => setActiveClassroom(null)}
        onOpenSyllabusForSubject={onNavigateToSyllabus}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-md bg-indigo-50 text-[#4F46E5]">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                {isStudent
                  ? 'My Classroom'
                  : isFaculty
                  ? 'My Assigned Classrooms'
                  : isHod
                  ? `${userDeptCode || 'Department'} Classrooms & Sections`
                  : 'Institutional Classrooms & Sections'}
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              {isStudent
                ? 'Your canonical digital academic classroom. Access your subjects, weekly timetable, teachers, and announcements.'
                : isFaculty
                ? 'Classrooms where you teach allocated courses or serve as class coordinator.'
                : isHod
                ? `Authoritative academic structure and active sections under ${userDeptName || userDeptCode}.`
                : 'Centralized registry of all academic classes, sections, teacher allocations, and curricula.'}
            </p>
          </div>

          {(isAdmin || isHod) && (
            <button
              onClick={() => {
                if (isHod) setFormDeptCode(userDeptCode);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Create Classroom</span>
            </button>
          )}
        </div>

        {/* Filter Controls (for Admin / HOD / Faculty) */}
        {!isStudent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search classroom, year, room..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            {isAdmin && (
              <div>
                <select
                  value={selectedDeptFilter}
                  onChange={e => setSelectedDeptFilter(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <select
                value={selectedYearFilter}
                onChange={e => setSelectedYearFilter(e.target.value)}
                className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="all">All Academic Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Classrooms Grid */}
      {displayedClassrooms.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-12 text-center shadow-2xs">
          <DoorOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Classrooms Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            {isStudent
              ? 'Your profile does not have a confirmed section assignment yet. Please complete your profile with department, year, and section.'
              : isFaculty
              ? 'You do not have any teaching subjects or classrooms assigned. Please contact your HOD or Admin.'
              : 'No classrooms currently match your filter criteria.'}
          </p>
          {(isAdmin || isHod) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1 px-3.5 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Classroom Section Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedClassrooms.map(sec => {
            const secDeptCode = (sec.departmentCode || '').toUpperCase().trim();
            const normSec = normalizeSec(sec.sectionName);

            // Count subjects strictly assigned to this classroom
            const secSubjects = subjects.filter(sub => {
              if (sub.classId && sub.classId === sec.id) return true;
              const subDept = (sub.departmentCode || '').toUpperCase().trim();
              const subYear = sub.year || (sub.semester ? Math.ceil(sub.semester / 2) : 0);
              return subDept === secDeptCode && subYear === sec.yearNumber && normalizeSec(sub.section) === normSec;
            });

            // Count students in this classroom
            const studentCount = students.filter(s => {
              const sDept = (s.departmentId || s.departmentName || '').toUpperCase().trim();
              return sDept.includes(secDeptCode) && s.year === sec.yearNumber && normalizeSec(s.section) === normSec;
            }).length;

            return (
              <div
                key={sec.id}
                className="bg-white rounded-lg border border-[#E2E8F0] hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[#4F46E5] font-black text-xs">
                      {sec.departmentCode}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {sec.academicYear}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0F172A] group-hover:text-indigo-600 transition-colors">
                    {sec.sectionName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sec.roomNumber || 'Room 101'} • Capacity: {sec.capacity || 60}
                  </p>
                </div>

                <div className="p-4 space-y-2.5 bg-slate-50/50 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      Class Subjects
                    </span>
                    <span className="font-bold text-slate-800">{secSubjects.length} courses</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      Enrolled Students
                    </span>
                    <span className="font-bold text-slate-800">{studentCount > 0 ? studentCount : 'Roster Active'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      Class Teacher
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                      {sec.classTeacherName || 'Coordinator Assigned'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    ID: {sec.id}
                  </span>
                  <button
                    onClick={() => handleOpenClassroom(sec)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#0F172A] hover:bg-indigo-600 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span>{isStudent ? 'Enter Classroom' : 'Open Workspace'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Classroom (Admin / HOD) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">Create New Classroom / Section</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={formDeptCode}
                  onChange={e => setFormDeptCode(e.target.value)}
                  disabled={isHod}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-[#4F46E5] disabled:opacity-70"
                >
                  {departments
                    .filter(d => (!isHod || d.code === userDeptCode))
                    .map(d => (
                      <option key={d.id} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={formAcademicYear}
                    onChange={e => setFormAcademicYear(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={formSectionName}
                    onChange={e => setFormSectionName(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                    <option value="Section C">Section C</option>
                    <option value="Section D">Section D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Room / Hall</label>
                  <input
                    type="text"
                    value={formRoomNumber}
                    onChange={e => setFormRoomNumber(e.target.value)}
                    placeholder="e.g. Room 204"
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formCapacity}
                    onChange={e => setFormCapacity(Number(e.target.value))}
                    min={1}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Class Teacher (Optional)</label>
                <select
                  value={formClassTeacherId}
                  onChange={e => setFormClassTeacherId(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter(u => (u.role === 'faculty' || u.role === 'hod') && (!formDeptCode || u.departmentCode === formDeptCode))
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.departmentCode || formDeptCode})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
