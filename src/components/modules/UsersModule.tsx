import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  CheckCircle2,
  X,
  Building2,
  GraduationCap,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Award,
  CalendarCheck,
  BookOpen,
  Edit3,
  Save,
  Phone,
  Mail,
  UserCheck,
  ShieldCheck,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole } from '../../types';
import { updateUserProfile } from '../../services/firestore/users';
import { updateStudentProfile } from '../../services/firestore/students';

export const UsersModule: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const {
    users,
    departments,
    sections,
    subjects,
    studentMarks,
    studentAttendance,
    queries,
    workloads,
    addNewUser,
    deleteUser,
    purgeDemoUsers,
    assignFacultySubjects
  } = useAcademicData();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // HOD Scoping Helpers
  const hodDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
  const hodDeptName = (currentUser?.department || '').toLowerCase().trim();

  const isUserInHodDept = (u: UserProfile) => {
    if (currentRole !== 'hod') return true;
    const uCode = (u.departmentCode || '').toUpperCase().trim();
    const uDept = (u.department || '').toLowerCase().trim();
    return (
      (hodDeptCode && uCode === hodDeptCode) ||
      (hodDeptName && (uDept === hodDeptName || uDept.includes(hodDeptName) || hodDeptName.includes(uDept)))
    );
  };

  // Dedicated Member Inspection / Dossier State
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);
  const [inspectTab, setInspectTab] = useState<'profile' | 'marks' | 'attendance' | 'queries' | 'courses'>('profile');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isManagingSubjects, setIsManagingSubjects] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [isSavingSubjects, setIsSavingSubjects] = useState(false);
  const [editFormData, setEditFormData] = useState({
    regId: '',
    semester: 0,
    section: '',
    currentAcademicYear: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    designation: '',
    departmentCode: ''
  });

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>(
    currentRole === 'hod' ? (currentUser?.departmentCode || departments[0]?.code || '') : ''
  );
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');
  const [semester, setSemester] = useState<number>(0);
  const [section, setSection] = useState<string>('');
  const [regId, setRegId] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');

  const activeDept = departments.find(d => d.code === selectedDeptCode);

  // Clean Section list: Strictly database sections, Section A & Section B (no synthetic C, D, or random numbers)
  const availableSections = Array.from(
    new Set([
      ...(sections || [])
        .map(s => s.sectionName)
        .filter(sec => sec === 'Section A' || sec === 'Section B' || sec === 'A' || sec === 'B'),
      'Section A',
      'Section B'
    ])
  );

  const handleOpenInspect = (user: UserProfile) => {
    if (currentRole === 'hod' && !isUserInHodDept(user)) {
      showNotification('error', 'Access Denied: HOD may only view and manage records belonging to their own department.');
      return;
    }
    setInspectingUser(user);
    setInspectTab('profile');
    setIsEditingUser(false);
    setIsManagingSubjects(false);
    const initialSubIds = user.assignedSubjectIds || (user.assignedSubjectId ? [user.assignedSubjectId] : []);
    setSelectedSubjectIds(initialSubIds);
    setEditFormData({
      regId: user.regId || '',
      semester: user.semester || 0,
      section: user.section || '',
      currentAcademicYear: user.currentAcademicYear || (user.semester ? `${Math.ceil(user.semester / 2)}${Math.ceil(user.semester / 2) === 1 ? 'st' : Math.ceil(user.semester / 2) === 2 ? 'nd' : Math.ceil(user.semester / 2) === 3 ? 'rd' : 'th'} Year` : ''),
      phone: user.phone || '',
      parentName: user.parentName || user.guardianName || '',
      parentPhone: user.parentPhone || user.guardianContact || '',
      designation: user.designation || '',
      departmentCode: currentRole === 'hod'
        ? (hodDeptCode || currentUser?.departmentCode || user.departmentCode || '')
        : (user.departmentCode && user.departmentCode !== 'UNASSIGNED' ? user.departmentCode : (departments[0]?.code || ''))
    });
  };

  const handleSaveAllocations = async () => {
    if (!inspectingUser) return;
    try {
      setIsSavingSubjects(true);
      await assignFacultySubjects(inspectingUser.id, selectedSubjectIds);
      const allocatedNames = subjects.filter(s => selectedSubjectIds.includes(s.id)).map(s => s.name);
      setInspectingUser(prev => prev ? {
        ...prev,
        assignedSubjectIds: selectedSubjectIds,
        assignedSubjectNames: allocatedNames
      } : null);
      setIsManagingSubjects(false);
      showNotification('success', `Subject allocations for ${inspectingUser.name} updated successfully in Firestore.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update subject allocations.');
    } finally {
      setIsSavingSubjects(false);
    }
  };

  const handleSaveInspectUser = async () => {
    if (!inspectingUser) return;
    if (currentRole === 'hod' && !isUserInHodDept(inspectingUser)) {
      showNotification('error', 'Access Denied: HOD cannot modify user records of another department.');
      return;
    }
    setIsSavingUser(true);
    try {
      // HOD cannot reassign someone outside their department
      const effectiveDeptCode = currentRole === 'hod'
        ? (hodDeptCode || currentUser?.departmentCode || inspectingUser.departmentCode)
        : editFormData.departmentCode;

      const targetDept = departments.find(d => d.code === effectiveDeptCode) || departments[0];

      const updates: Partial<UserProfile> = {
        regId: editFormData.regId.trim(),
        phone: editFormData.phone.trim(),
        designation: editFormData.designation.trim()
      };

      if (targetDept) {
        updates.department = targetDept.name;
        updates.departmentCode = targetDept.code;
      }

      if (inspectingUser.role === 'student') {
        const semNum = Number(editFormData.semester) || 0;
        updates.semester = semNum;
        updates.section = editFormData.section;
        updates.currentAcademicYear = editFormData.currentAcademicYear;
        updates.parentName = editFormData.parentName.trim();
        updates.guardianName = editFormData.parentName.trim();
        updates.parentPhone = editFormData.parentPhone.trim();
        updates.guardianContact = editFormData.parentPhone.trim();
        if (targetDept && semNum > 0) {
          updates.designation = `B.Tech ${targetDept.code} - Semester ${semNum}`;
        }
      }

      await updateUserProfile(inspectingUser.id, updates);

      if (inspectingUser.role === 'student') {
        const studentYear = editFormData.currentAcademicYear
          ? parseInt(editFormData.currentAcademicYear.replace(/\D/g, ''), 10) || (Number(editFormData.semester) ? Math.ceil(Number(editFormData.semester) / 2) : 0)
          : (Number(editFormData.semester) ? Math.ceil(Number(editFormData.semester) / 2) : 0);

        await updateStudentProfile(inspectingUser.id, {
          rollNumber: editFormData.regId.trim(),
          registrationNumber: editFormData.regId.trim(),
          semester: Number(editFormData.semester) || 0,
          section: editFormData.section,
          year: studentYear,
          departmentId: targetDept ? targetDept.id : undefined,
          departmentName: targetDept ? targetDept.name : undefined
        });
      }

      setInspectingUser(prev => prev ? { ...prev, ...updates } : null);
      setIsEditingUser(false);
      showNotification('success', `Record and academic assignment for ${inspectingUser.name} updated successfully!`);
    } catch (e) {
      showNotification('error', 'Failed to update record in database.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 100% Database-driven filter + HOD Department-level Isolation
  const filteredUsers = users.filter(u => {
    // HOD is strictly restricted to members of their own department
    if (currentRole === 'hod' && !isUserInHodDept(u)) {
      return false;
    }
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.regId && u.regId.toLowerCase().includes(search.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const getInitials = (name: string) => {
    const parts = name.replace(/^Dr\.\s*|^Prof\.\s*|^Mr\.\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] + (name[1] || '')).toUpperCase();
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showNotification('error', 'Name and email are required.');
      return;
    }

    // HOD cannot create users in other departments or elevate to Admin/HOD
    const effectiveDeptCode = currentRole === 'hod'
      ? (hodDeptCode || currentUser?.departmentCode || 'EEE')
      : (selectedDeptCode || 'UNASSIGNED');
    const deptInfo = departments.find(d => d.code === effectiveDeptCode);
    const deptName = deptInfo ? deptInfo.name : (effectiveDeptCode || 'Unassigned Department');
    const deptCode = deptInfo ? deptInfo.code : (effectiveDeptCode || 'UNASSIGNED');
    const semNum = Number(semester) || 0;

    const assignedRole = currentRole === 'hod' && (role === 'admin' || role === 'hod')
      ? 'student'
      : role;

    addNewUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: assignedRole,
      department: deptName,
      departmentCode: deptCode,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: phone || '+91 98000 00000',
      regId: regId || (deptCode !== 'UNASSIGNED' ? `USN-${deptCode}-${Date.now().toString().slice(-4)}` : `USN-${Date.now().toString().slice(-4)}`),
      designation: designation || (assignedRole === 'student' ? (semNum > 0 && deptCode !== 'UNASSIGNED' ? `B.Tech ${deptCode} Sem ${semNum}` : 'Student (Unassigned)') : 'Faculty Member'),
      semester: assignedRole === 'student' ? (semNum > 0 ? semNum : undefined) : undefined,
      section: assignedRole === 'student' ? (section || undefined) : undefined,
      currentAcademicYear: assignedRole === 'student' ? (currentAcademicYear || undefined) : undefined,
      joiningYear: '2026',
      status: 'active'
    });

    setIsAddModalOpen(false);
    setName('');
    setEmail('');
    setRegId('');
    setDesignation('');
    setSelectedDeptCode(currentRole === 'hod' ? (currentUser?.departmentCode || '') : '');
    setCurrentAcademicYear('');
    setSemester(0);
    setSection('');
    showNotification('success', `User account for ${name} registered successfully!`);
  };

  const handleDeleteUser = async (userId: string) => {
    // Critical Admin Protection: Prevent deletion of Admin accounts at application level
    const target = users.find(u => u.id === userId);
    if (userId === 'u-admin-1' || target?.role === 'admin' || target?.email?.toLowerCase().includes('admin@')) {
      showNotification('error', 'CRITICAL SECURITY VIOLATION: Institutional Administrator accounts cannot be deleted.');
      setDeleteConfirmId(null);
      return;
    }

    if (currentRole === 'hod' && target && !isUserInHodDept(target)) {
      showNotification('error', 'Access Denied: HOD cannot delete users outside their own department.');
      setDeleteConfirmId(null);
      return;
    }

    try {
      await deleteUser(userId);
      setDeleteConfirmId(null);
      showNotification('success', 'User removed from institutional records.');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to delete user.');
    }
  };

  const handlePurgeDemoUsers = async () => {
    setIsPurging(true);
    try {
      await purgeDemoUsers();
      showNotification('success', 'All demo users successfully removed from the system!');
    } catch (err) {
      showNotification('error', 'Failed to purge demo users.');
    } finally {
      setIsPurging(false);
    }
  };

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
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Title Header matching SaaS styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#D9E6DE] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#14382C]">Institutional User & Identity Directory</h1>
            <p className="text-xs text-[#527568] mt-0.5">
              Manage student enrollment, faculty appointments, HOD assignments, and credentials ({users.length} registered member{users.length === 1 ? '' : 's'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {users.length > 0 && (
            <button
              onClick={handlePurgeDemoUsers}
              disabled={isPurging}
              className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Remove all pre-seeded demo users from database"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>{isPurging ? 'Purging...' : 'Remove Demo Users'}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (departments.length > 0) setSelectedDeptCode(departments[0].code);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#1B8B67] hover:bg-[#167557] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-100" />
            <span>Enroll New Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#D9E6DE] text-xs shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#6F8B7F] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, Roll No / USN, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#D9E6DE] bg-[#F4F8F6] text-[#14382C] placeholder-[#6F8B7F] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B8B67]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-[#527568] font-bold mr-1">Role:</span>
          {['all', 'admin', 'hod', 'faculty', 'lab_assistant', 'student'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                roleFilter === r
                  ? 'bg-[#1B8B67] text-white shadow-xs'
                  : 'bg-[#EBF3EE] text-[#3D6052] hover:text-[#14382C]'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table or Clean Empty State */}
      {users.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] mb-1">
            0 Institutional Members Registered
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-5">
            All demo users have been removed. The database is clean. Click below to enroll your test faculty, students, or staff accounts whenever you are ready.
          </p>
          <button
            onClick={() => {
              if (departments.length > 0) setSelectedDeptCode(departments[0].code);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Enroll New Member
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 text-center text-xs text-slate-500 shadow-2xs">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          No institutional members match your search criteria.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Class / Section</th>
                  <th className="py-2.5 px-3">Roll No / USN</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{user.name}</p>
                          <p className="text-[10px] text-slate-500">{user.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {user.departmentCode || user.department}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {user.role === 'student' ? (
                        <span>{user.semester ? `Sem ${user.semester}` : 'Sem Unassigned'} • {user.section || 'Sec Unassigned'}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800 font-semibold">{user.regId}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{user.email}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenInspect(user)}
                          className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title={user.role === 'student' ? 'Inspect Student Records (Marks, Attendance)' : 'Inspect Member Details'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{user.role === 'student' ? 'View Student' : 'View'}</span>
                        </button>
                        {user.role === 'admin' || user.id === 'u-admin-1' || user.email?.toLowerCase().includes('admin@') ? (
                          <span
                            className="inline-flex items-center gap-1 text-slate-700 font-semibold text-[10px] bg-slate-100 px-2 py-1 rounded border border-slate-200"
                            title="Institutional Administrator account is protected from deletion"
                          >
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(user.id)}
                            disabled={currentRole === 'hod' && !isUserInHodDept(user)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete User Account</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to remove this user from the institutional database?
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Enroll New Institutional Member
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Institutional Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@academiccore.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Institutional Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty Member</option>
                    <option value="lab_assistant">Lab Assistant</option>
                    {currentRole !== 'hod' && (
                      <>
                        <option value="hod">Head of Department (HOD)</option>
                        <option value="admin">Administrator</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={currentRole === 'hod' ? (hodDeptCode || currentUser?.departmentCode) : selectedDeptCode}
                    onChange={e => setSelectedDeptCode(e.target.value)}
                    disabled={currentRole === 'hod'}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium disabled:opacity-80 disabled:cursor-not-allowed"
                  >
                    {currentRole === 'hod' ? (
                      <option value={hodDeptCode || currentUser?.departmentCode}>
                        {currentUser?.department || hodDeptCode} (Your Department)
                      </option>
                    ) : (
                      <>
                        <option value="">Unassigned / Select Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.code}>
                            {d.code} - {d.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {role === 'student' ? 'Roll No / USN' : 'Employee ID'}
                  </label>
                  <input
                    type="text"
                    placeholder={role === 'student' ? 'e.g. 1AC22CS042' : 'e.g. EMP-CSE-101'}
                    value={regId}
                    onChange={e => setRegId(e.target.value)}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder={role === 'student' ? 'e.g. B.Tech EEE - 2nd Year' : 'e.g. Assistant Professor'}
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium"
                  />
                </div>
              </div>

              {role === 'student' && (
                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-900 block">Class Assignment</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Academic Year</label>
                      <select
                        value={currentAcademicYear}
                        onChange={e => setCurrentAcademicYear(e.target.value)}
                        className="w-full p-1.5 rounded bg-white border border-[#E2E8F0] text-xs"
                      >
                        <option value="">Select Year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Semester</label>
                      <select
                        value={semester}
                        onChange={e => setSemester(Number(e.target.value))}
                        className="w-full p-1.5 rounded bg-white border border-[#E2E8F0] text-xs"
                      >
                        <option value={0}>Select Sem</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Section</label>
                      <select
                        value={section}
                        onChange={e => setSection(e.target.value)}
                        className="w-full p-1.5 rounded bg-white border border-[#E2E8F0] text-xs font-semibold"
                      >
                        <option value="">Select Section</option>
                        {availableSections.map(secName => (
                          <option key={secName} value={secName}>{secName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  Enroll Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. View/Manage Member Record Modal (Strict Authorized Admin Inspection) */}
      {inspectingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E2E8F0] animate-in fade-in zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {getInitials(inspectingUser.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-[#0F172A]">{inspectingUser.name}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-[#4F46E5] border border-indigo-200">
                      {inspectingUser.role.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {inspectingUser.regId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {inspectingUser.departmentCode || inspectingUser.department} • {inspectingUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingUser(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Tabs */}
            <div className="flex items-center gap-1 px-4 pt-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs">
              <button
                onClick={() => setInspectTab('profile')}
                className={`px-3 py-1.5 font-semibold rounded-t border-b-2 transition-all cursor-pointer ${
                  inspectTab === 'profile'
                    ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Profile & Credentials
              </button>

              {inspectingUser.role === 'student' && (
                <>
                  <button
                    onClick={() => setInspectTab('marks')}
                    className={`px-3 py-1.5 font-semibold rounded-t border-b-2 transition-all cursor-pointer ${
                      inspectTab === 'marks'
                        ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Assessment Marks ({studentMarks.filter(sm => Boolean(sm.studentId) && (sm.studentId === inspectingUser.id || sm.studentId === inspectingUser.regId)).length})
                  </button>
                  <button
                    onClick={() => setInspectTab('attendance')}
                    className={`px-3 py-1.5 font-semibold rounded-t border-b-2 transition-all cursor-pointer ${
                      inspectTab === 'attendance'
                        ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Attendance Record ({studentAttendance.filter(a => {
                      if (!a.studentId && !a.usn) return false;
                      const sid = (a.studentId || '').toLowerCase();
                      const susn = (a.usn || '').toLowerCase();
                      const cid = (inspectingUser.id || '').toLowerCase();
                      const creg = (inspectingUser.regId || '').toLowerCase();
                      return (cid && (sid === cid || susn === cid)) || (creg && (sid === creg || susn === creg));
                    }).length})
                  </button>
                  <button
                    onClick={() => setInspectTab('queries')}
                    className={`px-3 py-1.5 font-semibold rounded-t border-b-2 transition-all cursor-pointer ${
                      inspectTab === 'queries'
                        ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Grievance Tickets
                  </button>
                </>
              )}

              {(inspectingUser.role === 'faculty' || inspectingUser.role === 'lab_assistant' || inspectingUser.role === 'hod') && (
                <button
                  onClick={() => {
                    setInspectTab('courses');
                    setIsManagingSubjects(false);
                    setSelectedSubjectIds(inspectingUser.assignedSubjectIds || (inspectingUser.assignedSubjectId ? [inspectingUser.assignedSubjectId] : []));
                  }}
                  className={`px-3 py-1.5 font-semibold rounded-t border-b-2 transition-all cursor-pointer ${
                    inspectTab === 'courses'
                      ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Allocated Courses ({
                    (inspectingUser.assignedSubjectIds && inspectingUser.assignedSubjectIds.length > 0)
                      ? inspectingUser.assignedSubjectIds.length
                      : subjects.filter(s => s.facultyId === inspectingUser.id || (s.facultyName && inspectingUser.name && (s.facultyName.toLowerCase().includes(inspectingUser.name.toLowerCase()) || inspectingUser.name.toLowerCase().includes(s.facultyName.toLowerCase())))).length
                  })
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Tab 1: Profile & Credentials */}
              {inspectTab === 'profile' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-sm">Official Record Metadata</span>
                    <button
                      onClick={() => setIsEditingUser(!isEditingUser)}
                      className="px-2.5 py-1 rounded border border-[#E2E8F0] hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      {isEditingUser ? 'Cancel Edit' : 'Edit Member Details'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Roll Number / Registration ID</label>
                      {isEditingUser ? (
                        <input
                          type="text"
                          value={editFormData.regId}
                          onChange={e => setEditFormData({ ...editFormData, regId: e.target.value })}
                          className="w-full p-2 rounded border border-[#E2E8F0] bg-white text-xs font-mono font-semibold"
                        />
                      ) : (
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-slate-800 font-semibold">
                          {inspectingUser.regId || 'Not Assigned'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-slate-600">
                        {inspectingUser.email}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          Department {isEditingUser && <span className="text-amber-600 font-bold">(Admin Control)</span>}
                        </label>
                        {isEditingUser && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                            Admin Editable
                          </span>
                        )}
                      </div>
                      {isEditingUser ? (
                        <select
                          value={currentRole === 'hod' ? (hodDeptCode || currentUser?.departmentCode) : editFormData.departmentCode}
                          onChange={e => setEditFormData({ ...editFormData, departmentCode: e.target.value })}
                          disabled={currentRole === 'hod'}
                          className="w-full p-2 rounded border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#4F46E5] disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          {currentRole === 'hod' ? (
                            <option value={hodDeptCode || currentUser?.departmentCode}>
                              {currentUser?.department || hodDeptCode} (Your Department)
                            </option>
                          ) : (
                            departments.map(dept => (
                              <option key={dept.code} value={dept.code}>
                                {dept.code} — {dept.name}
                              </option>
                            ))
                          )}
                        </select>
                      ) : (
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                          {inspectingUser.department && inspectingUser.departmentCode !== 'UNASSIGNED'
                            ? `${inspectingUser.department} (${inspectingUser.departmentCode})`
                            : 'Unassigned Department'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Contact Phone</label>
                      {isEditingUser ? (
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                          className="w-full p-2 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                        />
                      ) : (
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                          {inspectingUser.phone || 'Not Provided'}
                        </div>
                      )}
                    </div>

                    {inspectingUser.role === 'student' && (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-600">
                              Academic Year {isEditingUser && <span className="text-amber-600 font-bold">(Admin Control)</span>}
                            </label>
                            {isEditingUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                Admin Editable
                              </span>
                            )}
                          </div>
                          {isEditingUser ? (
                            <select
                              value={editFormData.currentAcademicYear}
                              onChange={e => setEditFormData({ ...editFormData, currentAcademicYear: e.target.value })}
                              className="w-full p-2 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                            >
                              <option value="">Unassigned / Select Year</option>
                              <option value="1st Year">1st Year</option>
                              <option value="2nd Year">2nd Year</option>
                              <option value="3rd Year">3rd Year</option>
                              <option value="4th Year">4th Year</option>
                            </select>
                          ) : (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              {inspectingUser.currentAcademicYear || (inspectingUser.semester ? `Year ${Math.ceil(inspectingUser.semester / 2)}` : 'Unassigned')}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-600">
                              Enrolled Semester {isEditingUser && <span className="text-amber-600 font-bold">(Admin Control)</span>}
                            </label>
                            {isEditingUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                Admin Editable
                              </span>
                            )}
                          </div>
                          {isEditingUser ? (
                            <select
                              value={editFormData.semester}
                              onChange={e => setEditFormData({ ...editFormData, semester: Number(e.target.value) })}
                              className="w-full p-2 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                            >
                              <option value={0}>Unassigned / Select Semester</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              {inspectingUser.semester ? `Semester ${inspectingUser.semester}` : 'Unassigned'}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-600">
                              Section {isEditingUser && <span className="text-amber-600 font-bold">(Admin Control)</span>}
                            </label>
                            {isEditingUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                Admin Editable
                              </span>
                            )}
                          </div>
                          {isEditingUser ? (
                            <select
                              value={editFormData.section}
                              onChange={e => setEditFormData({ ...editFormData, section: e.target.value })}
                              className="w-full p-2 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                            >
                              <option value="">Unassigned / Select Section</option>
                              {availableSections.map(secName => (
                                <option key={secName} value={secName}>{secName}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              {inspectingUser.section || 'Unassigned'}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent / Guardian Name</label>
                          {isEditingUser ? (
                            <input
                              type="text"
                              value={editFormData.parentName}
                              onChange={e => setEditFormData({ ...editFormData, parentName: e.target.value })}
                              className="w-full p-2 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                            />
                          ) : (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              {inspectingUser.parentName || 'Not Provided'}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent Emergency Phone</label>
                          {isEditingUser ? (
                            <input
                              type="text"
                              value={editFormData.parentPhone}
                              onChange={e => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                              className="w-full p-2 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                            />
                          ) : (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              {inspectingUser.parentPhone || 'Not Provided'}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {isEditingUser && (
                    <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                      <button
                        onClick={() => setIsEditingUser(false)}
                        className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveInspectUser}
                        disabled={isSavingUser}
                        className="px-4 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5 text-amber-400" />
                        {isSavingUser ? 'Saving...' : 'Save Updates'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Assessment Marks (for students) */}
              {inspectTab === 'marks' && inspectingUser.role === 'student' && (() => {
                const marksList = studentMarks.filter(
                  sm => Boolean(sm.studentId) && (sm.studentId === inspectingUser.id || sm.studentId === inspectingUser.regId)
                );
                return marksList.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">0 Assessment Marks Recorded</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No assessment marks (Minor 1, Minor 2, Mid Sem, or End Sem) have been entered for this student in the database yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded border border-[#E2E8F0]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Course</th>
                          <th className="py-2.5 px-3 text-center">Minor 1</th>
                          <th className="py-2.5 px-3 text-center">Minor 2</th>
                          <th className="py-2.5 px-3 text-center">Mid Sem</th>
                          <th className="py-2.5 px-3 text-center">End Sem</th>
                          <th className="py-2.5 px-3 text-center">Total Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {marksList.map(sm => {
                          const m1 = typeof sm.minor1 === 'number' ? sm.minor1 : null;
                          const m2 = typeof sm.minor2 === 'number' ? sm.minor2 : null;
                          const mid = typeof sm.midSem === 'number' ? sm.midSem : null;
                          const end = typeof sm.endSem === 'number' ? sm.endSem : null;
                          const entered = [m1, m2, mid, end].filter((m): m is number => m !== null);
                          const total = entered.length > 0 ? entered.reduce((a, b) => a + b, 0) : null;

                          return (
                            <tr key={sm.subjectId || sm.subjectCode}>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded mr-1">
                                  {sm.subjectCode}
                                </span>
                                {sm.subjectName}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {m1 !== null ? <span className="font-bold text-slate-800">{m1}</span> : <span className="text-slate-400 font-mono">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {m2 !== null ? <span className="font-bold text-slate-800">{m2}</span> : <span className="text-slate-400 font-mono">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {mid !== null ? <span className="font-bold text-slate-800">{mid}</span> : <span className="text-slate-400 font-mono">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {end !== null ? <span className="font-bold text-slate-800">{end}</span> : <span className="text-slate-400 font-mono">—</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-[#0F172A]">
                                {total !== null ? total : <span className="text-slate-400 font-mono font-normal">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Tab 3: Attendance (for students) */}
              {inspectTab === 'attendance' && inspectingUser.role === 'student' && (() => {
                const attList = studentAttendance.filter(a => {
                  if (!a.studentId && !a.usn) return false;
                  const sid = (a.studentId || '').toLowerCase();
                  const susn = (a.usn || '').toLowerCase();
                  const cid = (inspectingUser.id || '').toLowerCase();
                  const creg = (inspectingUser.regId || '').toLowerCase();
                  return (cid && (sid === cid || susn === cid)) || (creg && (sid === creg || susn === creg));
                });
                return attList.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">0 Attendance Records Logged</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No attendance sessions have been logged for this student yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attList.map(a => (
                      <div key={a.subjectId} className="p-3 rounded-lg border border-[#E2E8F0] bg-slate-50/50 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-[10px] font-bold bg-white px-1 py-0.5 rounded border border-slate-200">
                              {a.subjectCode}
                            </span>
                            <h4 className="font-bold text-slate-900 text-xs mt-0.5">{a.subjectName}</h4>
                          </div>
                          <span className={`text-xs font-bold font-mono ${a.percentage >= 75 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {a.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${a.percentage >= 75 ? 'bg-emerald-600' : 'bg-red-600'}`}
                            style={{ width: `${Math.min(100, a.percentage)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Attended: {a.attendedClasses}/{a.totalClasses} classes</span>
                          <span className={`font-semibold text-[10px] ${a.percentage >= 75 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {a.percentage >= 75 ? 'Compliant' : 'Shortage'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Tab 4: Queries (for students) */}
              {inspectTab === 'queries' && inspectingUser.role === 'student' && (() => {
                const userQueries = queries.filter(
                  q => q.studentId === inspectingUser.id || q.usn === inspectingUser.regId || (inspectingUser.name && q.studentName.toLowerCase().includes(inspectingUser.name.toLowerCase()))
                );
                return userQueries.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No Grievances / Inquiries Logged</p>
                    <p className="text-xs text-slate-400 mt-1">This student has not submitted any academic or facility inquiries.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userQueries.map(q => (
                      <div key={q.id} className="p-3 rounded-lg border border-[#E2E8F0] bg-white text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {q.ticketId}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            q.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {q.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900">{q.title}</h4>
                        <p className="text-slate-600 text-[11px]">{q.description}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Tab 5: Courses (for Faculty/Lab Assistant/HOD) */}
              {inspectTab === 'courses' && (inspectingUser.role === 'faculty' || inspectingUser.role === 'lab_assistant' || inspectingUser.role === 'hod') && (() => {
                const userAssignedIds = inspectingUser.assignedSubjectIds || (inspectingUser.assignedSubjectId ? [inspectingUser.assignedSubjectId] : []);
                const facultyCourses = subjects.filter(
                  s => (userAssignedIds.length > 0 ? userAssignedIds.includes(s.id) : (
                    s.facultyId === inspectingUser.id ||
                    (s.facultyName && inspectingUser.name && (
                      s.facultyName.toLowerCase().includes(inspectingUser.name.toLowerCase()) ||
                      inspectingUser.name.toLowerCase().includes(s.facultyName.toLowerCase())
                    ))
                  ))
                );

                const userDeptCode = (inspectingUser.departmentCode || '').toUpperCase().trim();
                const userDeptName = (inspectingUser.department || '').toLowerCase().trim();
                const deptSubjects = subjects.filter(s => {
                  if (userDeptCode && s.departmentCode) {
                    return s.departmentCode.toUpperCase().trim() === userDeptCode;
                  }
                  if (userDeptName && s.department) {
                    return s.department.toLowerCase().trim() === userDeptName || userDeptName.includes(s.department.toLowerCase().trim());
                  }
                  return false;
                });

                const canManageAssignments = currentRole === 'admin' || (currentRole === 'hod' && isUserInHodDept(inspectingUser));

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          Course & Laboratory Allocations
                        </h4>
                        <p className="text-xs text-slate-500">
                          Department: <span className="font-semibold text-slate-700">{inspectingUser.department || inspectingUser.departmentCode}</span> • {facultyCourses.length} assigned course{facultyCourses.length === 1 ? '' : 's'}
                        </p>
                      </div>

                      {canManageAssignments && (
                        <button
                          onClick={() => {
                            if (!isManagingSubjects) {
                              setSelectedSubjectIds(userAssignedIds);
                            }
                            setIsManagingSubjects(!isManagingSubjects);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#D9E6DE] hover:bg-[#F4F8F6] text-[#14382C] font-semibold text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#1B8B67]" />
                          {isManagingSubjects ? 'Cancel Allocation Edit' : 'Manage Allocations'}
                        </button>
                      )}
                    </div>

                    {isManagingSubjects ? (
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700">
                            Select Subjects for {inspectingUser.name} ({deptSubjects.length} available in {inspectingUser.departmentCode || inspectingUser.department}):
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSubjectIds(deptSubjects.map(s => s.id))}
                              className="text-[11px] font-bold text-[#1B8B67] hover:underline cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedSubjectIds([])}
                              className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {deptSubjects.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
                            No subjects registered in this department yet. Please add subjects first in the Syllabus or Curriculum registry.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                            {deptSubjects.map(sub => {
                              const isChecked = selectedSubjectIds.includes(sub.id);
                              return (
                                <div
                                  key={sub.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setSelectedSubjectIds(selectedSubjectIds.filter(id => id !== sub.id));
                                    } else {
                                      setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                                    }
                                  }}
                                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                                    isChecked
                                      ? 'border-[#1B8B67] bg-[#EAF5EF]'
                                      : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // handled by parent div
                                    className="mt-0.5 rounded text-[#1B8B67] focus:ring-[#1B8B67] cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">
                                        {sub.code}
                                      </span>
                                      <span className="text-[10px] uppercase font-bold text-slate-400">
                                        {sub.type}
                                      </span>
                                    </div>
                                    <p className="font-bold text-slate-900 truncate mt-0.5">{sub.name}</p>
                                    <p className="text-[11px] text-slate-500">Sem {sub.semester} • {sub.credits} Credits</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                          <span className="text-xs text-slate-600 font-medium">
                            {selectedSubjectIds.length} subject{selectedSubjectIds.length === 1 ? '' : 's'} selected
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsManagingSubjects(false)}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveAllocations}
                              disabled={isSavingSubjects}
                              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#1B8B67] hover:bg-[#167557] text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {isSavingSubjects ? 'Saving...' : 'Save Subject Allocations'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : facultyCourses.length === 0 ? (
                      <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                        <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700">No Courses Allocated</p>
                        <p className="text-xs text-slate-400 mt-1">This instructor has not been assigned to any curriculum subjects yet.</p>
                        {canManageAssignments && (
                          <button
                            onClick={() => {
                              setSelectedSubjectIds([]);
                              setIsManagingSubjects(true);
                            }}
                            className="mt-3 px-3 py-1.5 rounded-md bg-[#1B8B67] text-white text-xs font-bold hover:bg-[#167557] cursor-pointer"
                          >
                            Assign Subjects Now
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {facultyCourses.map(sub => (
                          <div key={sub.id} className="p-3 rounded-lg border border-[#E2E8F0] bg-white text-xs space-y-1.5">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {sub.code}
                                </span>
                                <h4 className="font-bold text-slate-900 mt-1">{sub.name}</h4>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-[#4F46E5]">
                                Sem {sub.semester}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px]">{sub.credits} Credits • {sub.type.toUpperCase()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
