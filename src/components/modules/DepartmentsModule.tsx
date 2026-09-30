import React, { useState } from 'react';
import {
  Building2,
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  GraduationCap,
  FlaskConical,
  Calendar,
  Filter,
  ChevronRight,
  BookOpen,
  Layers,
  UserCheck,
  Award,
  DoorOpen
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { DepartmentInfo } from '../../types';
import { AcademicSection } from '../../services/firestore/sections';
import { ClassDetailsModule } from './ClassDetailsModule';

interface DepartmentsModuleProps {
  onNavigateToSyllabus?: (subjectId: string) => void;
}

export const DepartmentsModule: React.FC<DepartmentsModuleProps> = ({ onNavigateToSyllabus }) => {
  const {
    departments,
    sections,
    subjects,
    users,
    students,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createSection,
    updateSection,
    deleteSection
  } = useAcademicData();
  const { currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Department Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hodName, setHodName] = useState('');
  const [hodEmail, setHodEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [establishedYear, setEstablishedYear] = useState<number>(2020);
  const [labsCount, setLabsCount] = useState<number>(2);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Structure / Sections Inspector Drawer or Modal
  const [selectedDeptForStructure, setSelectedDeptForStructure] = useState<DepartmentInfo | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<AcademicSection | null>(null);

  // Section / Class Form Fields (clean Department -> Academic Year -> Class/Section hierarchy)
  const [academicYear, setAcademicYear] = useState<string>('2nd Year');
  const [sectionName, setSectionName] = useState<string>('Section A');
  const [roomNumber, setRoomNumber] = useState<string>('Room 204');
  const [capacity, setCapacity] = useState<number>(60);
  const [classTeacherId, setClassTeacherId] = useState<string>('');

  // Structure Filters inside modal
  const [filterStructureYear, setFilterStructureYear] = useState<string>('all');
  const [filterStructureSection, setFilterStructureSection] = useState<string>('all');

  // Selected Section View inside Inspector
  const [selectedSectionForView, setSelectedSectionForView] = useState<AcademicSection | null>(null);

  // Active Class for Dedicated Class Management Workspace
  const [activeClassForManagement, setActiveClassForManagement] = useState<{ section: AcademicSection; dept: DepartmentInfo } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const openCreateDeptModal = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setHodName('');
    setHodEmail('');
    setPhone('');
    setLocation('');
    setEstablishedYear(new Date().getFullYear());
    setLabsCount(2);
    setDescription('');
    setStatus('active');
    setIsDeptModalOpen(true);
  };

  const openEditDeptModal = (dept: DepartmentInfo) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setHodName(dept.hodName);
    setHodEmail(dept.hodEmail);
    setPhone(dept.phone || '');
    setLocation(dept.location || '');
    setEstablishedYear(dept.establishedYear || 2020);
    setLabsCount(dept.labsCount || 0);
    setDescription(dept.description || '');
    setStatus(dept.status || 'active');
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      showNotification('error', 'Department Name and Code are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          hodName: hodName.trim(),
          hodEmail: hodEmail.trim(),
          phone: phone.trim(),
          location: location.trim(),
          establishedYear: Number(establishedYear) || 2020,
          labsCount: Number(labsCount) || 0,
          description: description.trim(),
          status
        });
        showNotification('success', `Department "${code.toUpperCase()}" updated successfully.`);
      } else {
        await createDepartment({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          hodName: hodName.trim(),
          hodEmail: hodEmail.trim(),
          phone: phone.trim(),
          location: location.trim(),
          establishedYear: Number(establishedYear) || new Date().getFullYear(),
          labsCount: Number(labsCount) || 0,
          description: description.trim(),
          status,
          facultyCount: 0,
          studentCount: 0,
          avgAttendance: 0,
          syllabusCompletion: 0
        });
        showNotification('success', `Department "${code.toUpperCase()}" created successfully.`);
      }
      setIsDeptModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (dept: DepartmentInfo) => {
    const newStatus = dept.status === 'inactive' ? 'active' : 'inactive';
    try {
      await updateDepartment(dept.id, { status: newStatus });
      showNotification('success', `Department ${dept.code} marked as ${newStatus}.`);
    } catch (err: any) {
      showNotification('error', 'Failed to update department status.');
    }
  };

  const handleDeleteDept = async (deptId: string) => {
    try {
      await deleteDepartment(deptId);
      setDeleteConfirmId(null);
      showNotification('success', 'Department deleted from registry.');
    } catch (err: any) {
      showNotification('error', 'Failed to delete department.');
    }
  };

  // Section / Class Management Methods (Department -> Academic Year -> Class/Section)
  const openCreateSectionModal = (dept: DepartmentInfo) => {
    setEditingSection(null);
    setAcademicYear('2nd Year');
    setSectionName('Section A');
    setRoomNumber('Room 204');
    setCapacity(60);
    setClassTeacherId('');
    setIsSectionModalOpen(true);
  };

  const openEditSectionModal = (sec: AcademicSection) => {
    setEditingSection(sec);
    setAcademicYear(sec.academicYear || '2nd Year');
    setSectionName(sec.sectionName === 'Section B' ? 'Section B' : 'Section A');
    setRoomNumber(sec.roomNumber || '');
    setCapacity(sec.capacity || 60);
    setClassTeacherId(sec.classTeacherId || '');
    setIsSectionModalOpen(true);
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptForStructure) return;
    if (!sectionName.trim()) {
      showNotification('error', 'Section is required.');
      return;
    }

    const teacher = users.find(u => u.id === classTeacherId);

    setIsSubmitting(true);
    try {
      if (editingSection) {
        await updateSection(editingSection.id, {
          academicYear,
          yearNumber: Number(academicYear.charAt(0)) || 1,
          sectionName: sectionName.trim(),
          roomNumber: roomNumber.trim(),
          capacity: Number(capacity) || 60,
          classTeacherId: classTeacherId || undefined,
          classTeacherName: teacher ? teacher.name : undefined
        });
        showNotification('success', `Class "${academicYear} - ${sectionName}" updated.`);
      } else {
        await createSection({
          departmentId: selectedDeptForStructure.id,
          departmentCode: selectedDeptForStructure.code,
          departmentName: selectedDeptForStructure.name,
          academicYear,
          yearNumber: Number(academicYear.charAt(0)) || 1,
          sectionName: sectionName.trim(),
          roomNumber: roomNumber.trim(),
          capacity: Number(capacity) || 60,
          classTeacherId: classTeacherId || undefined,
          classTeacherName: teacher ? teacher.name : undefined,
          status: 'active'
        });
        showNotification('success', `Class "${academicYear} - ${sectionName}" created under ${selectedDeptForStructure.code}.`);
      }
      setIsSectionModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSection = async (secId: string) => {
    try {
      await deleteSection(secId);
      if (selectedSectionForView?.id === secId) setSelectedSectionForView(null);
      showNotification('success', 'Academic section removed.');
    } catch (err: any) {
      showNotification('error', 'Failed to remove section.');
    }
  };

  // Dynamic faculty count per department from users collection
  const getDeptFacultyCount = (deptCode: string, deptName: string) => {
    return users.filter(
      u =>
        (u.role === 'faculty' || u.role === 'hod') &&
        (u.departmentCode?.toLowerCase() === deptCode.toLowerCase() ||
          u.department?.toLowerCase() === deptName.toLowerCase())
    ).length;
  };

  // Dynamic student count per department from users and students collections
  const getDeptStudentCount = (deptCode: string, deptName: string) => {
    const sIds = new Set<string>();
    users
      .filter(
        u =>
          u.role === 'student' &&
          (u.departmentCode?.toLowerCase() === deptCode.toLowerCase() ||
            u.department?.toLowerCase() === deptName.toLowerCase())
      )
      .forEach(u => sIds.add(u.id || u.email));
    students
      .filter(
        s =>
          s.departmentName?.toLowerCase() === deptName.toLowerCase() ||
          s.departmentId?.toLowerCase().includes(deptCode.toLowerCase())
      )
      .forEach(s => sIds.add(s.userId || s.id || s.email));
    return sIds.size;
  };

  const filteredDepts = departments.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.hodName.toLowerCase().includes(search.toLowerCase()) ||
      (d.location && d.location.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && d.status !== 'inactive') ||
      (statusFilter === 'inactive' && d.status === 'inactive');

    return matchesSearch && matchesStatus;
  });

  const totalDeptsCount = departments.length;
  const activeDeptsCount = departments.filter(d => d.status !== 'inactive').length;

  // Active established department codes and IDs for strict isolation & counting
  const activeDeptCodes = new Set(departments.filter(d => d.status !== 'inactive').map(d => d.code.toUpperCase()));
  const activeDeptIds = new Set(departments.filter(d => d.status !== 'inactive').map(d => d.id));

  // Registered active sections belonging to established active departments
  const activeRegisteredSections = sections.filter(
    s =>
      s.status !== 'inactive' &&
      (activeDeptCodes.has(s.departmentCode?.toUpperCase()) || (s.departmentId && activeDeptIds.has(s.departmentId)))
  );
  const totalActiveSectionsCount = activeRegisteredSections.length;

  // If a specific class has been opened for management, render the dedicated Class Management workspace
  if (activeClassForManagement) {
    return (
      <ClassDetailsModule
        section={activeClassForManagement.section}
        department={activeClassForManagement.dept}
        onBack={() => setActiveClassForManagement(null)}
        onOpenSyllabusForSubject={onNavigateToSyllabus}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-red-50 text-red-800 border border-red-300'
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
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#4F46E5] border border-indigo-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#0F172A]">
              Academic Departments & Class Structure
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage engineering departments, HOD assignments, academic years, semesters, and class sections
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateDeptModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Add Department
          </button>
        )}
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Departments
          </span>
          <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">
            {totalDeptsCount}
          </span>
          <span className="text-[10px] text-slate-500">Established disciplines</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Class Sections
          </span>
          <span className="text-xl font-bold text-indigo-700 mt-0.5 block">
            {totalActiveSectionsCount}
          </span>
          <span className="text-[10px] text-slate-500">Registered sections</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Faculty Members
          </span>
          <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">
            {users.filter(u => u.role === 'faculty' || u.role === 'hod').length}
          </span>
          <span className="text-[10px] text-slate-500">Teaching appointments</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Enrolled Students
          </span>
          <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">
            {(() => {
              const ids = new Set<string>();
              users.filter(u => u.role === 'student').forEach(u => ids.add(u.id || u.email));
              students.forEach(s => ids.add(s.userId || s.id || s.email));
              return ids.size;
            })()}
          </span>
          <span className="text-[10px] text-slate-500">Active students</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by department name, code, HOD..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:bg-white"
          >
            <option value="all">All Departments ({totalDeptsCount})</option>
            <option value="active">Active Only ({activeDeptsCount})</option>
            <option value="inactive">Inactive Only ({totalDeptsCount - activeDeptsCount})</option>
          </select>
        </div>
      </div>

      {/* Department Cards Grid */}
      {filteredDepts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-[#E2E8F0] shadow-2xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Academic Departments Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? 'No department matches your current search keywords.'
              : 'No academic departments have been added yet. Click "Add Department" above to create one.'}
          </p>
          {isAdmin && !search && (
            <button
              onClick={openCreateDeptModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Create First Department (e.g. EEE)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map(dept => {
            const facultyNum = getDeptFacultyCount(dept.code, dept.name);
            const studentNum = getDeptStudentCount(dept.code, dept.name);
            const deptSections = sections.filter(
              s =>
                s.status !== 'inactive' &&
                (s.departmentCode?.toLowerCase() === dept.code.toLowerCase() ||
                  s.departmentId === dept.id)
            );
            const deptSubjects = subjects.filter(
              s =>
                s.department?.toLowerCase() === dept.name.toLowerCase() ||
                s.department?.toLowerCase() === dept.code.toLowerCase()
            );

            return (
              <div
                key={dept.id}
                className={`bg-white rounded-lg border transition-all shadow-2xs hover:shadow-md flex flex-col justify-between ${
                  dept.status === 'inactive' ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-[#E2E8F0]'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-200 text-[#4F46E5] font-black text-xs flex items-center justify-center shrink-0">
                        {dept.code}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-[#0F172A] leading-snug">
                          {dept.name}
                        </h2>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> Est. {dept.establishedYear || 2020}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        dept.status === 'inactive'
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {dept.status === 'inactive' ? 'Inactive' : 'Active'}
                    </span>
                  </div>

                  {dept.description && (
                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                      {dept.description}
                    </p>
                  )}
                </div>

                {/* HOD & Details */}
                <div className="p-4 space-y-2.5 bg-slate-50/50 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-700">HOD:</span>
                    <span className="truncate font-medium text-slate-900">
                      {dept.hodName || 'Unassigned'}
                    </span>
                  </div>

                  {dept.hodEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">{dept.hodEmail}</span>
                    </div>
                  )}

                  {dept.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">{dept.location}</span>
                    </div>
                  )}
                </div>

                {/* Quantitative Counters Grid */}
                <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 bg-white text-center py-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Sections</span>
                    <span className="text-xs font-bold text-indigo-700">{deptSections.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Faculty</span>
                    <span className="text-xs font-bold text-slate-800">{facultyNum}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Students</span>
                    <span className="text-xs font-bold text-slate-800">{studentNum}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Subjects</span>
                    <span className="text-xs font-bold text-slate-800">{deptSubjects.length}</span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedDeptForStructure(dept)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-xs font-bold transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Academic Structure & Sections
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditDeptModal(dept)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Edit Department Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {deleteConfirmId === dept.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-200">
                          <button
                            onClick={() => handleDeleteDept(dept.id)}
                            className="text-[10px] font-bold text-red-700 hover:underline cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(dept.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT DEPARTMENT MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-indigo-50 text-[#4F46E5] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingDept ? `Edit Department: ${editingDept.code}` : 'Create Academic Department'}
                </h3>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeptSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EEE"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs font-bold uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs font-medium focus:bg-white focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical & Electronics Engineering"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* HOD Assignment */}
              <div className="p-3.5 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-3">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Head of Department (HOD) Assignment
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      HOD Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={hodName}
                      onChange={e => setHodName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-md text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      HOD Official Email
                    </label>
                    <input
                      type="email"
                      placeholder="hod.eee@academiccore.edu"
                      value={hodEmail}
                      onChange={e => setHodEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-md text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / Extension
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98450 11223"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Building / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Electrical Block 2nd Floor"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Established Year
                  </label>
                  <input
                    type="number"
                    value={establishedYear}
                    onChange={e => setEstablishedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Associated Labs
                  </label>
                  <input
                    type="number"
                    value={labsCount}
                    onChange={e => setLabsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Description / Overview
                </label>
                <textarea
                  rows={2}
                  placeholder="Department academic focus, specializations, accreditation..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-3.5 py-2 rounded-md border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACADEMIC STRUCTURE & SECTIONS INSPECTOR MODAL */}
      {selectedDeptForStructure && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-[#E2E8F0] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {selectedDeptForStructure.code}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">
                    {selectedDeptForStructure.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Academic Year → Class/Section Hierarchy Management
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedDeptForStructure(null);
                  setSelectedSectionForView(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Structure Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Department Hierarchy
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Classes & Student Allocations
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Classes are registered objects associated with specific academic years and section A or B.
                  </p>
                </div>

                <button
                  onClick={() => openCreateSectionModal(selectedDeptForStructure)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  Add Class
                </button>
              </div>

              {/* Filter Controls for Academic Year & Section A / B */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E2E8F0] text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 font-semibold mr-1">Academic Year:</span>
                  {['all', '1st Year', '2nd Year', '3rd Year', '4th Year'].map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setFilterStructureYear(yr)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        filterStructureYear === yr
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {yr === 'all' ? 'All Years' : yr}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold mr-1">Section:</span>
                  {['all', 'Section A', 'Section B'].map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setFilterStructureSection(sec)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        filterStructureSection === sec
                          ? 'bg-[#4F46E5] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sec === 'all' ? 'All' : sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sections List Grouped by Year */}
              {(() => {
                const deptSecs = sections.filter(s => {
                  const matchDept =
                    s.departmentCode?.toLowerCase() === selectedDeptForStructure.code.toLowerCase() ||
                    s.departmentId === selectedDeptForStructure.id;
                  const matchYear = filterStructureYear === 'all' || s.academicYear === filterStructureYear;
                  const matchSec = filterStructureSection === 'all' || s.sectionName === filterStructureSection;
                  return s.status !== 'inactive' && matchDept && matchYear && matchSec;
                });

                if (deptSecs.length === 0) {
                  return (
                    <div className="text-center p-8 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                      <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">No Classes Found for {selectedDeptForStructure.code}</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Create classes such as 2nd Year → Section A or Section B to enroll students and assign faculty.
                      </p>
                      <button
                        onClick={() => openCreateSectionModal(selectedDeptForStructure)}
                        className="mt-3 px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-xs font-semibold cursor-pointer"
                      >
                        + Add First Class
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Active Classes ({deptSecs.length})
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {deptSecs.map(sec => {
                        const secStudents = users.filter(
                          u =>
                            u.role === 'student' &&
                            (u.departmentCode?.toLowerCase() === selectedDeptForStructure.code.toLowerCase() ||
                              u.department?.toLowerCase() === selectedDeptForStructure.name.toLowerCase()) &&
                            (u.section === sec.sectionName || u.section === sec.sectionName.replace('Section ', ''))
                        );

                        const secSubjects = subjects.filter(
                          s =>
                            (s.department?.toLowerCase() === selectedDeptForStructure.name.toLowerCase() ||
                              s.department?.toLowerCase() === selectedDeptForStructure.code.toLowerCase())
                        );

                        return (
                          <div
                            key={sec.id}
                            className={`p-4 rounded-lg border transition-all ${
                              selectedSectionForView?.id === sec.id
                                ? 'border-[#4F46E5] bg-indigo-50/30 ring-1 ring-[#4F46E5]'
                                : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                                  {sec.academicYear || 'Academic Year'}
                                </span>
                                <h5 className="text-sm font-bold text-[#0F172A] mt-0.5">
                                  {sec.sectionName}
                                </h5>
                                {sec.roomNumber && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <DoorOpen className="w-3 h-3 text-slate-400" /> {sec.roomNumber}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditSectionModal(sec)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                  title="Edit Section"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(sec.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                  title="Delete Section"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Enrolled Students</span>
                                <span className="font-bold text-slate-900">{secStudents.length} Students</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Subjects</span>
                                <span className="font-bold text-slate-900">{secSubjects.length} Courses</span>
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              <button
                                onClick={() => {
                                  setSelectedDeptForStructure(null);
                                  setActiveClassForManagement({ section: sec, dept: selectedDeptForStructure });
                                }}
                                className="w-full py-2 px-2.5 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                Class Management & Timetable
                              </button>

                              <button
                                onClick={() =>
                                  setSelectedSectionForView(selectedSectionForView?.id === sec.id ? null : sec)
                                }
                                className="w-full py-1.5 px-2 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                {selectedSectionForView?.id === sec.id ? 'Hide Quick Roster' : 'View Quick Roster'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* SECTION DRILL-DOWN ROSTER & SUBJECTS */}
              {selectedSectionForView && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      Class Roster & Subject Allocations: {selectedSectionForView.academicYear} → {selectedSectionForView.sectionName}
                    </h4>
                    <button
                      onClick={() => setSelectedSectionForView(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {/* Section Students Table */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 mb-2">
                      Enrolled Students ({
                        users.filter(
                          u =>
                            u.role === 'student' &&
                            (u.departmentCode?.toLowerCase() === selectedDeptForStructure.code.toLowerCase() ||
                              u.department?.toLowerCase() === selectedDeptForStructure.name.toLowerCase()) &&
                            (u.section === selectedSectionForView.sectionName || u.section === selectedSectionForView.sectionName.replace('Section ', ''))
                        ).length
                      })
                    </h5>

                    <div className="bg-white rounded border border-[#E2E8F0] overflow-hidden">
                      {users.filter(
                        u =>
                          u.role === 'student' &&
                          (u.departmentCode?.toLowerCase() === selectedDeptForStructure.code.toLowerCase() ||
                            u.department?.toLowerCase() === selectedDeptForStructure.name.toLowerCase()) &&
                          (u.section === selectedSectionForView.sectionName || u.section === selectedSectionForView.sectionName.replace('Section ', ''))
                      ).length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No students enrolled in this class yet.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <tr>
                              <th className="p-2">Roll No / USN</th>
                              <th className="p-2">Student Name</th>
                              <th className="p-2">Email</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {users
                              .filter(
                                u =>
                                  u.role === 'student' &&
                                  (u.departmentCode?.toLowerCase() === selectedDeptForStructure.code.toLowerCase() ||
                                    u.department?.toLowerCase() === selectedDeptForStructure.name.toLowerCase()) &&
                                  (u.section === selectedSectionForView.sectionName || u.section === selectedSectionForView.sectionName.replace('Section ', ''))
                              )
                              .map(st => (
                                <tr key={st.id}>
                                  <td className="p-2 font-mono font-bold text-slate-900">{st.regId}</td>
                                  <td className="p-2 font-semibold text-slate-800">{st.name}</td>
                                  <td className="p-2 text-slate-500">{st.email}</td>
                                  <td className="p-2">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold">
                                      Active
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => {
                  setSelectedDeptForStructure(null);
                  setSelectedSectionForView(null);
                }}
                className="px-4 py-2 rounded bg-[#0F172A] text-white font-semibold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CLASS (SECTION) MODAL */}
      {isSectionModalOpen && selectedDeptForStructure && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-[#0F172A]">
                {editingSection ? 'Edit Class' : `Add Class under ${selectedDeptForStructure.code}`}
              </h3>
              <button
                onClick={() => setIsSectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSectionSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded text-xs font-medium focus:bg-white"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={sectionName}
                    onChange={e => setSectionName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded text-xs font-bold focus:bg-white"
                  >
                    <option value="Section A">Section A</option>
                    <option value="Section B">Section B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room / Class Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 204"
                    value={roomNumber}
                    onChange={e => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded text-xs focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Advisor / Teacher (Optional)
                </label>
                <select
                  value={classTeacherId}
                  onChange={e => setClassTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded text-xs font-medium focus:bg-white"
                >
                  <option value="">No advisor assigned</option>
                  {users
                    .filter(u => u.role === 'faculty' || u.role === 'hod')
                    .map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.departmentCode || 'Faculty'})</option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-3.5 py-2 rounded border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingSection ? 'Update Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
