import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Archive,
  Folder,
  FileText,
  Download,
  Search,
  Filter,
  Upload,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  ExternalLink,
  Plus,
  X,
  Tag,
  Building2,
  Clock,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  BookMarked
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { MasterNote, AcademicBatch, MaterialType } from '../../types';

const MATERIAL_TYPES: MaterialType[] = [
  'Lecture Notes',
  'Syllabus Copy',
  'Lab Manual',
  'Question Bank',
  'Reference Material',
  'Assignment'
];

export const MasterNotesModule: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const {
    notes,
    batches,
    departments,
    subjects,
    createNote,
    updateNote,
    deleteNote,
    createBatch,
    updateBatch,
    deleteBatch
  } = useAcademicData();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'materials' | 'batches'>('materials');

  // Cascading Filter States
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>('all');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MasterNote | null>(null);
  const [viewingNote, setViewingNote] = useState<MasterNote | null>(null);
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState<string | null>(null);

  // Batch Management Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<AcademicBatch | null>(null);
  const [deleteConfirmBatchId, setDeleteConfirmBatchId] = useState<string | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Role Checks
  const isAdmin = currentRole === 'admin';
  const isHod = currentRole === 'hod';
  const isFaculty = currentRole === 'faculty';
  const isStudent = currentRole === 'student';

  const userDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();

  // Check if user can modify a specific note
  const canModifyNote = (note: MasterNote): boolean => {
    if (isAdmin) return true;
    if (isHod && (note.departmentCode?.toUpperCase() === userDeptCode || note.department === currentUser?.department)) {
      return true;
    }
    if (isFaculty && note.uploadedBy === currentUser?.id) {
      return true;
    }
    return false;
  };

  // Check if user can create or manage batches (Admin or HOD)
  const canManageBatches = isAdmin || isHod;

  // 1. Cascading Batches (dependent on department if selected)
  const availableBatches = useMemo(() => {
    if (selectedDeptCode === 'all') return batches;
    return batches.filter(
      b => !b.departmentCode || b.departmentCode === 'all' || b.departmentCode.toUpperCase() === selectedDeptCode.toUpperCase()
    );
  }, [batches, selectedDeptCode]);

  // 2. Cascading Years (1, 2, 3, 4) available from actual subjects or batches
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    subjects.forEach(s => {
      if (selectedDeptCode === 'all' || s.department === selectedDeptCode || s.departmentCode === selectedDeptCode) {
        if (s.year) yearsSet.add(s.year);
        else if (s.semester) yearsSet.add(Math.ceil(s.semester / 2));
      }
    });
    if (yearsSet.size === 0) return [1, 2, 3, 4];
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [subjects, selectedDeptCode]);

  // 3. Cascading Semesters (dependent on Year)
  const availableSemesters = useMemo(() => {
    if (selectedYear === 'all') {
      const semSet = new Set<number>();
      subjects.forEach(s => {
        if (selectedDeptCode === 'all' || s.department === selectedDeptCode || s.departmentCode === selectedDeptCode) {
          if (s.semester) semSet.add(s.semester);
        }
      });
      return semSet.size > 0 ? Array.from(semSet).sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8];
    }
    const yearNum = Number(selectedYear);
    return [yearNum * 2 - 1, yearNum * 2];
  }, [subjects, selectedDeptCode, selectedYear]);

  // 4. Cascading Subjects (dependent on Dept, Year, Semester)
  const availableSubjects = useMemo(() => {
    return subjects.filter(s => {
      const matchDept =
        selectedDeptCode === 'all' ||
        s.department === selectedDeptCode ||
        s.departmentCode === selectedDeptCode ||
        (departments.find(d => d.code === selectedDeptCode)?.name === s.department);

      const subYear = s.year || (s.semester ? Math.ceil(s.semester / 2) : 0);
      const matchYear = selectedYear === 'all' || subYear === Number(selectedYear);
      const matchSem = selectedSemester === 'all' || s.semester === Number(selectedSemester);

      return matchDept && matchYear && matchSem;
    });
  }, [subjects, selectedDeptCode, selectedYear, selectedSemester, departments]);

  // Reset dependent filters when parent filter changes
  const handleDepartmentChange = (dept: string) => {
    setSelectedDeptCode(dept);
    setSelectedSubjectId('all');
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedSemester('all');
    setSelectedSubjectId('all');
  };

  const handleSemesterChange = (sem: string) => {
    setSelectedSemester(sem);
    setSelectedSubjectId('all');
  };

  // Filtered Notes based on real database queries
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      // Cascading Dept filter
      if (selectedDeptCode !== 'all' && n.departmentCode?.toUpperCase() !== selectedDeptCode.toUpperCase()) {
        return false;
      }
      // Cascading Batch filter
      if (selectedBatchId !== 'all') {
        const batchObj = batches.find(b => b.id === selectedBatchId);
        if (n.batchId !== selectedBatchId && n.batch !== batchObj?.name) {
          return false;
        }
      }
      // Cascading Year filter
      if (selectedYear !== 'all' && n.year !== Number(selectedYear)) {
        return false;
      }
      // Cascading Semester filter
      if (selectedSemester !== 'all' && n.semester !== Number(selectedSemester)) {
        return false;
      }
      // Cascading Subject filter
      if (selectedSubjectId !== 'all' && n.subjectId !== selectedSubjectId && n.subjectCode !== selectedSubjectId) {
        return false;
      }
      // Material Type filter
      if (selectedMaterialType !== 'all' && n.materialType !== selectedMaterialType) {
        return false;
      }
      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchDesc = n.description?.toLowerCase().includes(q);
        const matchTopic = n.unitOrTopic?.toLowerCase().includes(q);
        const matchSub = n.subjectName?.toLowerCase().includes(q) || n.subjectCode?.toLowerCase().includes(q);
        const matchAuthor = n.uploadedByName?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTopic && !matchSub && !matchAuthor) {
          return false;
        }
      }
      return true;
    });
  }, [notes, selectedDeptCode, selectedBatchId, selectedYear, selectedSemester, selectedSubjectId, selectedMaterialType, searchQuery, batches]);

  // Upload/Edit Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDeptCode, setFormDeptCode] = useState(userDeptCode || departments[0]?.code || 'EEE');
  const [formBatch, setFormBatch] = useState(batches[0]?.name || '2026 Batch');
  const [formYear, setFormYear] = useState<number>(2);
  const [formSemester, setFormSemester] = useState<number>(3);
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formUnitOrTopic, setFormUnitOrTopic] = useState('');
  const [formMaterialType, setFormMaterialType] = useState<MaterialType>('Lecture Notes');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formVisibility, setFormVisibility] = useState<'college_wide' | 'department_only'>('college_wide');

  const openCreateNoteModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormDescription('');
    setFormDeptCode(isHod ? userDeptCode : (departments[0]?.code || 'EEE'));
    setFormBatch(batches[0]?.name || '2026 Batch');
    setFormYear(2);
    setFormSemester(3);
    setFormSubjectId(subjects[0]?.id || '');
    setFormUnitOrTopic('');
    setFormMaterialType('Lecture Notes');
    setFormFileUrl('');
    setFormFileName('');
    setFormVisibility('college_wide');
    setIsUploadModalOpen(true);
  };

  const openEditNoteModal = (note: MasterNote) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormDescription(note.description);
    setFormDeptCode(note.departmentCode);
    setFormBatch(note.batch || '');
    setFormYear(note.year);
    setFormSemester(note.semester);
    setFormSubjectId(note.subjectId);
    setFormUnitOrTopic(note.unitOrTopic);
    setFormMaterialType(note.materialType);
    setFormFileUrl(note.fileUrl);
    setFormFileName(note.fileName || '');
    setFormVisibility(note.visibility || 'college_wide');
    setIsUploadModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formUnitOrTopic.trim()) {
      showNotification('error', 'Note title and unit/topic are required.');
      return;
    }

    const selectedDept = departments.find(d => d.code === formDeptCode);
    const selectedSub = subjects.find(s => s.id === formSubjectId);
    const selectedBatchObj = batches.find(b => b.name === formBatch);

    const notePayload: Omit<MasterNote, 'id'> = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      department: selectedDept ? selectedDept.name : formDeptCode,
      departmentCode: formDeptCode,
      batch: formBatch,
      batchId: selectedBatchObj?.id,
      academicYear: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
      year: Number(formYear),
      semester: Number(formSemester),
      subjectId: formSubjectId || (selectedSub?.id || 'sub-general'),
      subjectCode: selectedSub?.code || 'GEN',
      subjectName: selectedSub?.name || 'General Academic Topic',
      unitOrTopic: formUnitOrTopic.trim(),
      materialType: formMaterialType,
      fileUrl: formFileUrl.trim() || 'https://academiccore.edu/repository/notes-preview.pdf',
      fileName: formFileName.trim() || `${formTitle.trim().replace(/\s+/g, '_')}.pdf`,
      fileSize: '2.4 MB',
      // Authenticated User Tracking (strictly no manual spoofing)
      uploadedBy: editingNote ? editingNote.uploadedBy : currentUser.id,
      uploadedByName: editingNote ? editingNote.uploadedByName : currentUser.name,
      uploadedByEmail: editingNote ? editingNote.uploadedByEmail : currentUser.email,
      uploadedByRole: editingNote ? editingNote.uploadedByRole : currentRole,
      uploadedAt: editingNote ? editingNote.uploadedAt : new Date().toISOString(),
      visibility: formVisibility
    };

    try {
      if (editingNote) {
        await updateNote(editingNote.id, notePayload);
        showNotification('success', `Material "${formTitle}" updated successfully!`);
      } else {
        await createNote(notePayload);
        showNotification('success', `Material "${formTitle}" uploaded to college repository!`);
      }
      setIsUploadModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save note to repository.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setDeleteConfirmNoteId(null);
      showNotification('success', 'Material removed from repository.');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to delete material.');
    }
  };

  // Batch Form State
  const [batchName, setBatchName] = useState('');
  const [batchStartYear, setBatchStartYear] = useState<number>(new Date().getFullYear() - 2);
  const [batchEndYear, setBatchEndYear] = useState<number>(new Date().getFullYear() + 2);
  const [batchStatus, setBatchStatus] = useState<'active' | 'archived'>('active');
  const [batchDeptCode, setBatchDeptCode] = useState<string>('all');
  const [batchDescription, setBatchDescription] = useState('');

  const openCreateBatchModal = () => {
    setEditingBatch(null);
    setBatchName(`${new Date().getFullYear() + 2} Batch`);
    setBatchStartYear(new Date().getFullYear() - 2);
    setBatchEndYear(new Date().getFullYear() + 2);
    setBatchStatus('active');
    setBatchDeptCode(isHod ? userDeptCode : 'all');
    setBatchDescription('');
    setIsBatchModalOpen(true);
  };

  const openEditBatchModal = (b: AcademicBatch) => {
    setEditingBatch(b);
    setBatchName(b.name);
    setBatchStartYear(b.startYear);
    setBatchEndYear(b.endYear);
    setBatchStatus(b.status);
    setBatchDeptCode(b.departmentCode || 'all');
    setBatchDescription(b.description || '');
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) {
      showNotification('error', 'Batch name is required.');
      return;
    }

    const payload: Omit<AcademicBatch, 'id'> = {
      name: batchName.trim(),
      startYear: Number(batchStartYear),
      endYear: Number(batchEndYear),
      departmentCode: batchDeptCode === 'all' ? undefined : batchDeptCode,
      status: batchStatus,
      description: batchDescription.trim()
    };

    try {
      if (editingBatch) {
        await updateBatch(editingBatch.id, payload);
        showNotification('success', `Batch "${batchName}" updated successfully!`);
      } else {
        await createBatch(payload);
        showNotification('success', `Batch "${batchName}" created in institutional archive!`);
      }
      setIsBatchModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save batch record.');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await deleteBatch(batchId);
      setDeleteConfirmBatchId(null);
      showNotification('success', 'Batch record removed from archive.');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to delete batch.');
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
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner matching SaaS styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#D9E6DE] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#14382C]">Master Notes & Academic Batches Repository</h1>
            <p className="text-xs text-[#527568] mt-0.5">
              Structured institutional learning repository: Department → Batch → Year → Semester → Subject → Materials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageBatches && (
            <button
              onClick={openCreateBatchModal}
              className="px-3.5 py-2 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-[#1B8B67]" />
              <span>Create Batch</span>
            </button>
          )}

          {(isAdmin || isHod || isFaculty) && (
            <button
              onClick={openCreateNoteModal}
              className="px-4 py-2 rounded-xl bg-[#1B8B67] hover:bg-[#167557] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-100" />
              <span>Upload Material</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-[#EBF3EE] p-1 rounded-xl border border-[#D9E6DE] w-fit text-xs">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'materials'
              ? 'bg-[#1B8B67] text-white shadow-xs'
              : 'text-[#3D6052] hover:text-[#14382C]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Academic Materials Repository ({notes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-[#1B8B67] text-white shadow-xs'
              : 'text-[#3D6052] hover:text-[#14382C]'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Batch Archive ({batches.length})</span>
        </button>
      </div>

      {/* TAB 1: ACADEMIC MATERIALS REPOSITORY */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Cascading Filter Bar */}
          <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Hierarchical Cascading Filters</span>
              </div>
              <button
                onClick={() => {
                  setSelectedDeptCode('all');
                  setSelectedBatchId('all');
                  setSelectedYear('all');
                  setSelectedSemester('all');
                  setSelectedSubjectId('all');
                  setSelectedMaterialType('all');
                  setSearchQuery('');
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              {/* 1. Department Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Department
                </label>
                <select
                  value={selectedDeptCode}
                  onChange={e => handleDepartmentChange(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Batch Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Batches</option>
                  {availableBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.status === 'archived' ? '(Archived)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Year Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Academic Year
                </label>
                <select
                  value={selectedYear}
                  onChange={e => handleYearChange(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>
                      {yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : `${yr}th Year`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Semester Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={e => handleSemesterChange(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Semesters</option>
                  {availableSemesters.map(sem => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Subject Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Subjects</option>
                  {availableSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Material Type Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Material Type
                </label>
                <select
                  value={selectedMaterialType}
                  onChange={e => setSelectedMaterialType(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="all">All Types</option>
                  {MATERIAL_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keyword Search */}
            <div className="pt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search materials by title, unit name, topic, or faculty uploader..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
              <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Showing {filteredNotes.length} material{filteredNotes.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {/* Notes Content Grid / Table */}
          {filteredNotes.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-12 text-center text-slate-500">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No materials available for the selected filters.</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No repository documents have been recorded matching this academic hierarchy. Faculty or administrators may upload syllabus units, lecture presentations, and question banks.
              </p>
              {(isAdmin || isHod || isFaculty) && (
                <button
                  onClick={openCreateNoteModal}
                  className="mt-4 px-3.5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Upload First Note</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredNotes.map(note => {
                const canEdit = canModifyNote(note);
                return (
                  <div
                    key={note.id}
                    className="bg-white rounded-lg border border-[#E2E8F0] hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-4 space-y-2.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-[#4F46E5] border border-indigo-200">
                          {note.materialType}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {note.batch}
                        </span>
                      </div>

                      {/* Title & Topic */}
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A] leading-snug line-clamp-1" title={note.title}>
                          {note.title}
                        </h3>
                        <p className="text-xs font-semibold text-indigo-700 mt-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{note.unitOrTopic}</span>
                        </p>
                      </div>

                      {/* Course Hierarchy */}
                      <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-slate-700 space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="font-mono text-slate-900">{note.subjectCode}</span>
                          <span className="text-slate-500">Sem {note.semester} • {note.year} Year</span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">{note.subjectName}</p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{note.department} ({note.departmentCode})</span>
                        </div>
                      </div>

                      {/* Description preview */}
                      {note.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {note.description}
                        </p>
                      )}

                      {/* Author / Timestamp */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <div className="flex items-center gap-1 truncate max-w-[170px]" title={note.uploadedByName}>
                          <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-700">{note.uploadedByName}</span>
                          <span className="text-slate-400 uppercase font-mono">({note.uploadedByRole})</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{note.uploadedAt?.split('T')[0] || 'Recent'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="p-3 bg-slate-50/70 border-t border-[#E2E8F0] flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => setViewingNote(note)}
                        className="px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-100 border border-[#E2E8F0] text-slate-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Inspect</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={note.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[#4F46E5] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>

                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEditNoteModal(note)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
                              title="Edit material metadata"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmNoteId(note.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-white transition-colors cursor-pointer"
                              title="Delete material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BATCH ARCHIVE MANAGEMENT */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Archive className="w-4 h-4 text-indigo-600" />
                <span>Institutional Academic Batches & Cohorts</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Students and faculty can access historical curriculum and lecture archives by cohort
              </p>
            </div>
            {canManageBatches && (
              <button
                onClick={openCreateBatchModal}
                className="px-3.5 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-300" />
                <span>Add Academic Batch</span>
              </button>
            )}
          </div>

          {batches.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-12 text-center text-slate-500">
              <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No batches available.</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No academic cohorts have been defined yet. Create batches (e.g. 2026 Batch, 2025 Batch) to organize academic materials and archives.
              </p>
              {canManageBatches && (
                <button
                  onClick={openCreateBatchModal}
                  className="mt-4 px-3.5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Initial Batch</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {batches.map(batch => {
                const isActive = batch.status === 'active';
                const batchNotesCount = notes.filter(n => n.batch === batch.name || n.batchId === batch.id).length;

                return (
                  <div
                    key={batch.id}
                    className="bg-white rounded-lg border border-[#E2E8F0] p-4 flex flex-col justify-between hover:border-indigo-300 hover:shadow-xs transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isActive ? 'Active Batch' : 'Archived Batch'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {batch.startYear} – {batch.endYear}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">{batch.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {batch.description || 'Standard institutional four-year undergraduate engineering cohort.'}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">Associated Repository Files</span>
                        <span className="font-bold text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {batchNotesCount} materials
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setActiveTab('materials');
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Batch Materials</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {canManageBatches && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditBatchModal(batch)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer"
                            title="Edit Batch"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirmBatchId(batch.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-50 cursor-pointer"
                              title="Delete Batch"
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
        </div>
      )}

      {/* INSPECT MATERIAL MODAL */}
      {viewingNote && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Material Details & Verification
                </h3>
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-[#4F46E5] border border-indigo-200">
                  {viewingNote.materialType}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">{viewingNote.title}</h2>
                <p className="text-xs font-semibold text-indigo-700 mt-0.5">{viewingNote.unitOrTopic}</p>
              </div>

              {viewingNote.description && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed">
                  {viewingNote.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <p className="font-semibold text-slate-800">{viewingNote.department} ({viewingNote.departmentCode})</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Academic Cohort</span>
                  <p className="font-semibold text-slate-800">{viewingNote.batch}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Year & Semester</span>
                  <p className="font-semibold text-slate-800">{viewingNote.year} Year • Sem {viewingNote.semester}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Subject Code</span>
                  <p className="font-semibold text-slate-800 font-mono">{viewingNote.subjectCode} - {viewingNote.subjectName}</p>
                </div>
              </div>

              {/* Uploader provenance */}
              <div className="p-3 rounded bg-amber-50/50 border border-amber-200 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Verified Uploader</span>
                  <span className="font-semibold text-slate-900">{viewingNote.uploadedByName}</span>
                  <span className="text-slate-500 ml-1">({viewingNote.uploadedByRole?.toUpperCase()})</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Upload Timestamp</span>
                  <span className="text-slate-700 font-mono text-[10px]">{viewingNote.uploadedAt}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setViewingNote(null)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <a
                  href={viewingNote.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#4F46E5] hover:bg-indigo-700 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download / Open Document</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD / EDIT NOTE MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-600" />
                {editingNote ? 'Edit Academic Material' : 'Upload Academic Material to Repository'}
              </h2>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Document / Material Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 1: DC Machine Principles and Armature Reaction"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Material Type *</label>
                  <select
                    value={formMaterialType}
                    onChange={e => setFormMaterialType(e.target.value as MaterialType)}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-slate-900 focus:bg-white"
                  >
                    {MATERIAL_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Unit / Syllabus Topic *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit 1 Notes"
                    value={formUnitOrTopic}
                    onChange={e => setFormUnitOrTopic(e.target.value)}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Hierarchy Selection */}
              <div className="p-3 bg-slate-50/70 rounded-md border border-[#E2E8F0] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Curriculum Hierarchy Alignment
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Department *</label>
                    <select
                      value={formDeptCode}
                      onChange={e => setFormDeptCode(e.target.value)}
                      disabled={isHod}
                      className="w-full p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium disabled:opacity-75"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.code}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Academic Batch *</label>
                    <select
                      value={formBatch}
                      onChange={e => setFormBatch(e.target.value)}
                      className="w-full p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                    >
                      {batches.map(b => (
                        <option key={b.id} value={b.name}>{b.name} ({b.status})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Year</label>
                    <select
                      value={formYear}
                      onChange={e => setFormYear(Number(e.target.value))}
                      className="w-full p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Semester</label>
                    <select
                      value={formSemester}
                      onChange={e => setFormSemester(Number(e.target.value))}
                      className="w-full p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Subject</label>
                    <select
                      value={formSubjectId}
                      onChange={e => setFormSubjectId(e.target.value)}
                      className="w-full p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">File / Storage URL</label>
                <input
                  type="text"
                  placeholder="https://... or secure storage link"
                  value={formFileUrl}
                  onChange={e => setFormFileUrl(e.target.value)}
                  className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description & Topic Notes</label>
                <textarea
                  rows={3}
                  placeholder="Summary of lecture notes, unit syllabus coverage, or revision points..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white cursor-pointer"
                >
                  {editingNote ? 'Save Changes' : 'Publish to Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT BATCH MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-indigo-600" />
                {editingBatch ? 'Edit Batch Archive' : 'Create Academic Batch'}
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Batch"
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Start Year</label>
                  <input
                    type="number"
                    value={batchStartYear}
                    onChange={e => setBatchStartYear(Number(e.target.value))}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={batchEndYear}
                    onChange={e => setBatchEndYear(Number(e.target.value))}
                    className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cohort Status *</label>
                <select
                  value={batchStatus}
                  onChange={e => setBatchStatus(e.target.value as 'active' | 'archived')}
                  className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold"
                >
                  <option value="active">Active Batch (Current Enrolled Students)</option>
                  <option value="archived">Archived Batch (Graduated Cohort)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional cohort description..."
                  value={batchDescription}
                  onChange={e => setBatchDescription(e.target.value)}
                  className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white cursor-pointer"
                >
                  {editingBatch ? 'Update Batch' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL - NOTE */}
      {deleteConfirmNoteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remove Material</h3>
                <p className="text-xs text-slate-500">This action removes the note from repository.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to permanently delete this academic document?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmNoteId(null)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNote(deleteConfirmNoteId)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL - BATCH */}
      {deleteConfirmBatchId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Batch Record</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to remove this batch from the archive?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBatchId(null)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBatch(deleteConfirmBatchId)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
