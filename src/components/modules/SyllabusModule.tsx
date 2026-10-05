import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  X,
  Building2,
  Users,
  GraduationCap,
  Search,
  Filter,
  CheckSquare,
  Square,
  BookOpen,
  Layers,
  Sparkles,
  AlertCircle,
  UploadCloud,
  FileUp,
  FileText,
  Download,
  ExternalLink,
  File,
  RefreshCw,
  Eye,
  Paperclip
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { Subject, SyllabusUnit, SyllabusTopic, MasterNote, MaterialType } from '../../types';
import { uploadUnitNoteFile, deleteUnitNoteFile } from '../../services/storage';

const SUPPORTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'txt'];
const DANGEROUS_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'vbs', 'js', 'mjs', 'ts', 'py', 'apk', 'bin', 'msi', 'dll', 'com', 'scr'];

function validateNoteFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'This file type is not supported for security reasons.' };
  }
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: 'This file type is not supported. Please upload PDF, Word (DOC/DOCX), PowerPoint (PPT/PPTX), Excel (XLS/XLSX), or Images.'
    };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 25 MB limit. Please choose a smaller file.' };
  }
  return { valid: true };
}

function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes)) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName?: string, fileType?: string) {
  const ext = (fileName || fileType || '').split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-600" />;
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-4 h-4 text-blue-600" />;
  if (['ppt', 'pptx'].includes(ext || '')) return <FileText className="w-4 h-4 text-orange-600" />;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileText className="w-4 h-4 text-emerald-600" />;
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return <FileText className="w-4 h-4 text-purple-600" />;
  return <FileText className="w-4 h-4 text-slate-500" />;
}

interface SyllabusModuleProps {
  initialSubjectId?: string;
  initialDept?: string;
}

export const SyllabusModule: React.FC<SyllabusModuleProps> = ({ initialSubjectId, initialDept }) => {
  const { currentRole, actualRole, currentUser } = useAuth();
  const {
    subjects,
    departments,
    sections,
    users,
    notes,
    createNote,
    updateNote,
    deleteNote,
    toggleSyllabusTopic,
    createSubject,
    updateSubject,
    updateSubjectUnits,
    deleteSubject
  } = useAcademicData();

  const isAdmin = currentRole === 'admin';
  const isHod = currentRole === 'hod';
  const isFaculty = currentRole === 'faculty';
  const isLabAssistant = currentRole === 'lab_assistant';
  const canManageSubjects = isAdmin || isHod;

  const facultyAssignedIds = React.useMemo(() => {
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
  const accessibleSubjects = React.useMemo(() => {
    if (isAdmin) {
      return subjects;
    }
    if (isHod) {
      const hodDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const hodDeptName = (currentUser?.department || '').toLowerCase().trim();
      return subjects.filter(s => {
        const subDeptCode = (s.departmentCode || '').toUpperCase().trim();
        const subDeptName = (s.department || '').toLowerCase().trim();
        return (hodDeptCode && subDeptCode === hodDeptCode) || (hodDeptName && (subDeptName === hodDeptName || subDeptName.includes(hodDeptName)));
      });
    }
    if (isFaculty || isLabAssistant) {
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
    if (currentRole === 'student' || actualRole === 'student') {
      const stuDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const stuDeptName = (currentUser?.department || '').toLowerCase().trim();
      const stuYear = currentUser?.currentAcademicYear
        ? Number(currentUser.currentAcademicYear.charAt(0))
        : (currentUser?.semester ? Math.ceil(currentUser.semester / 2) : undefined);
      const stuSec = (currentUser?.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();

      return subjects.filter(s => {
        const subDeptCode = (s.departmentCode || '').toUpperCase().trim();
        const subDeptName = (s.department || '').toLowerCase().trim();
        const isDeptMatch = (stuDeptCode && subDeptCode === stuDeptCode) || (stuDeptName && (subDeptName === stuDeptName || subDeptName.includes(stuDeptName)));
        if (!isDeptMatch) return false;

        const subYear = s.year || (s.semester ? Math.ceil(s.semester / 2) : undefined);
        if (stuYear && subYear && subYear !== stuYear) return false;

        const subSec = (s.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
        if (stuSec && subSec && subSec !== stuSec) return false;

        return true;
      });
    }
    return [];
  }, [subjects, isAdmin, isHod, isFaculty, isLabAssistant, currentRole, actualRole, currentUser, facultyAssignedIds]);

  // Filter States
  const [filterDept, setFilterDept] = useState<string>(initialDept || 'all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSem, setFilterSem] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected active subject for Syllabus Builder
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId || null);

  useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
      setFilterDept('all');
      setFilterYear('all');
      setFilterSem('all');
      setFilterSection('all');
    }
  }, [initialSubjectId]);

  const [expandedUnitIds, setExpandedUnitId] = useState<Record<string, boolean>>({});

  // Modals & Forms State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<SyllabusUnit | null>(null);

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [activeUnitIdForTopic, setActiveUnitIdForTopic] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ topic: SyllabusTopic; unitId: string } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ type: 'subject' | 'unit' | 'topic'; id: string; parentId?: string } | null>(null);

  // Subject Form State
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subDept, setSubDept] = useState(departments[0]?.name || 'Computer Science & Engineering');
  const [subYear, setSubYear] = useState<number>(3);
  const [subSemester, setSubSemester] = useState<number>(5);
  const [subSection, setSubSection] = useState<string>('A');
  const [subCredits, setSubCredits] = useState<number>(4);
  const [subType, setSubType] = useState<'theory' | 'lab' | 'integrated'>('theory');
  const [subFacultyId, setSubFacultyId] = useState('');
  const [subDescription, setSubDescription] = useState('');

  // Unit Form State
  const [unitNum, setUnitNum] = useState<number>(1);
  const [unitTitle, setUnitTitle] = useState('');
  const [unitDesc, setUnitDescription] = useState('');

  // Topic Form State
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDescription] = useState('');
  const [topicHours, setTopicHours] = useState<number>(2);

  // Unit Notes Upload & Management State
  const [isUploadNoteModalOpen, setIsUploadNoteModalOpen] = useState(false);
  const [uploadTargetUnit, setUploadTargetUnit] = useState<SyllabusUnit | null>(null);
  const [selectedNoteFile, setSelectedNoteFile] = useState<File | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteMaterialType, setNoteMaterialType] = useState<MaterialType>('Lecture Notes');
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingNote, setIsUploadingNote] = useState(false);

  // Edit Note Details State
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MasterNote | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteDesc, setEditNoteDesc] = useState('');
  const [editNoteMaterialType, setEditNoteMaterialType] = useState<MaterialType>('Lecture Notes');

  // Replace Note File State
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replacingNote, setReplacingNote] = useState<MasterNote | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const facultyUsers = users.filter(u => u.role === 'faculty' || u.role === 'hod');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter matching subjects dynamically from authoritative accessible subjects
  const matchingSubjects = accessibleSubjects.filter(sub => {
    const matchDept = filterDept === 'all' ||
      sub.department.toLowerCase().trim() === filterDept.toLowerCase().trim() ||
      departments.find(d => d.code === filterDept)?.name.toLowerCase().trim() === sub.department.toLowerCase().trim();

    const matchYear = filterYear === 'all' ||
      sub.year === Number(filterYear) ||
      (sub.semester && Math.ceil(sub.semester / 2) === Number(filterYear));

    const matchSem = filterSem === 'all' || sub.semester === Number(filterSem);

    const normFilterSec = filterSection.replace(/^Section\s+/i, '').trim().toUpperCase();
    const normSubSec = (sub.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
    const matchSection = filterSection === 'all' || normSubSec === normFilterSec;

    const matchSearch = !searchQuery.trim() ||
      sub.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.description && sub.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchDept && matchYear && matchSem && matchSection && matchSearch;
  });

  // Keep selected subject valid
  React.useEffect(() => {
    if (matchingSubjects.length > 0) {
      if (!selectedSubjectId || !matchingSubjects.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(matchingSubjects[0].id);
      }
    } else {
      setSelectedSubjectId(null);
    }
  }, [accessibleSubjects, filterDept, filterYear, filterSem, filterSection, searchQuery]);

  const activeSubject = subjects.find(s => s.id === selectedSubjectId) || matchingSubjects[0] || null;

  // Authoritative check if activeSubject is authorized for the current user
  const isSubjectAuthorized = React.useMemo(() => {
    if (!activeSubject) return false;
    if (isAdmin) return true;
    if (isHod) {
      const hodDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const hodDeptName = (currentUser?.department || '').toLowerCase().trim();
      const subDeptCode = (activeSubject.departmentCode || '').toUpperCase().trim();
      const subDeptName = (activeSubject.department || '').toLowerCase().trim();
      return (hodDeptCode && subDeptCode === hodDeptCode) || (hodDeptName && (subDeptName === hodDeptName || subDeptName.includes(hodDeptName)));
    }
    if (isFaculty || isLabAssistant) {
      const userDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const userDeptName = (currentUser?.department || '').toLowerCase().trim();
      const subDeptCode = (activeSubject.departmentCode || '').toUpperCase().trim();
      const subDeptName = (activeSubject.department || '').toLowerCase().trim();
      const isDeptMatch = !userDeptCode || subDeptCode === userDeptCode || subDeptName === userDeptName;
      const isAssigned = facultyAssignedIds.has(activeSubject.id) || facultyAssignedIds.has(activeSubject.code) || activeSubject.facultyId === currentUser?.id;
      return isDeptMatch && isAssigned;
    }
    return true;
  }, [activeSubject, isAdmin, isHod, isFaculty, isLabAssistant, currentUser, facultyAssignedIds]);

  const canEditCoverage = (isAdmin || isHod || isFaculty || isLabAssistant) && isSubjectAuthorized;

  // Strict role permissions for uploading/managing study notes:
  // - Students: Strictly read-only
  // - Faculty: Authorized assigned subjects/classrooms only
  // - HOD: Department-wide subjects only
  // - Admin: All
  const canManageNotes = React.useMemo(() => {
    if (currentRole === 'student' || actualRole === 'student') return false;
    return canEditCoverage;
  }, [currentRole, actualRole, canEditCoverage]);

  // Compute coverage metrics dynamically from actual topics
  const computeSubjectMetrics = (sub: Subject | null) => {
    if (!sub || !sub.units || sub.units.length === 0) {
      return { totalUnits: 0, totalTopics: 0, completedTopics: 0, topicCoveragePct: 0, totalHours: 0, completedHours: 0, hoursCoveragePct: 0 };
    }

    let totalTopics = 0;
    let completedTopics = 0;
    let totalHours = 0;
    let completedHours = 0;

    sub.units.forEach(u => {
      if (u.topics) {
        totalTopics += u.topics.length;
        u.topics.forEach(t => {
          const h = t.hours || 1;
          totalHours += h;
          if (t.completed) {
            completedTopics += 1;
            completedHours += h;
          }
        });
      }
    });

    const topicCoveragePct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const hoursCoveragePct = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

    return {
      totalUnits: sub.units.length,
      totalTopics,
      completedTopics,
      topicCoveragePct,
      totalHours,
      completedHours,
      hoursCoveragePct
    };
  };

  const activeMetrics = computeSubjectMetrics(activeSubject);

  const toggleUnitExpand = (unitId: string) => {
    setExpandedUnitId(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Open Subject Modal (Create or Edit)
  const openSubjectModal = (sub?: Subject) => {
    if (sub) {
      setEditingSubject(sub);
      setSubCode(sub.code);
      setSubName(sub.name);
      setSubDept(sub.department);
      setSubYear(sub.year || Math.ceil((sub.semester || 1) / 2));
      setSubSemester(sub.semester || 1);
      setSubSection(sub.section || 'A');
      setSubCredits(sub.credits || 3);
      setSubType(sub.type || 'theory');
      setSubFacultyId(sub.facultyId || '');
      setSubDescription(sub.description || '');
    } else {
      setEditingSubject(null);
      setSubCode('');
      setSubName('');
      setSubDept(departments[0]?.name || 'Computer Science & Engineering');
      setSubYear(3);
      setSubSemester(5);
      setSubSection('A');
      setSubCredits(4);
      setSubType('theory');
      setSubFacultyId(facultyUsers[0]?.id || '');
      setSubDescription('');
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCode.trim() || !subName.trim()) {
      showNotification('error', 'Subject code and title are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedFac = facultyUsers.find(f => f.id === subFacultyId);
      const facName = assignedFac?.name || currentUser.name;

      if (editingSubject) {
        await updateSubject(editingSubject.id, {
          code: subCode.trim().toUpperCase(),
          name: subName.trim(),
          department: subDept,
          year: Number(subYear),
          semester: Number(subSemester),
          section: subSection,
          credits: Number(subCredits),
          type: subType,
          facultyId: assignedFac?.id || currentUser.id,
          facultyName: facName,
          description: subDescription.trim()
        });
        showNotification('success', `Course subject ${subCode.toUpperCase()} updated successfully.`);
      } else {
        const generatedId = `sub-${subCode.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
        const newSubject: Subject = {
          id: generatedId,
          code: subCode.trim().toUpperCase(),
          name: subName.trim(),
          department: subDept,
          year: Number(subYear),
          semester: Number(subSemester),
          section: subSection,
          credits: Number(subCredits),
          type: subType,
          facultyId: assignedFac?.id || currentUser.id,
          facultyName: facName,
          description: subDescription.trim(),
          totalHoursPlanned: 45,
          hoursConducted: 0,
          units: [], // Clean empty units array — no fake hardcoded topics!
          status: 'on_track'
        };

        await createSubject(newSubject);
        setSelectedSubjectId(generatedId);
        showNotification('success', `Course subject ${subCode.toUpperCase()} created! You can now build units & topics.`);
      }
      setIsSubjectModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save course subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Unit Modal
  const openUnitModal = (unit?: SyllabusUnit) => {
    if (!activeSubject) return;
    if (unit) {
      setEditingUnit(unit);
      setUnitNum(unit.unitNumber);
      setUnitTitle(unit.title);
      setUnitDescription(unit.description || '');
    } else {
      setEditingUnit(null);
      setUnitNum((activeSubject.units?.length || 0) + 1);
      setUnitTitle('');
      setUnitDescription('');
    }
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !unitTitle.trim()) {
      showNotification('error', 'Unit title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      let currentUnits = [...(activeSubject.units || [])];

      if (editingUnit) {
        currentUnits = currentUnits.map(u => {
          if (u.id === editingUnit.id) {
            return {
              ...u,
              unitNumber: Number(unitNum),
              title: unitTitle.trim(),
              description: unitDesc.trim()
            };
          }
          return u;
        });
      } else {
        const newUnitId = `u-${Date.now()}`;
        const newUnit: SyllabusUnit = {
          id: newUnitId,
          unitNumber: Number(unitNum),
          title: unitTitle.trim(),
          description: unitDesc.trim(),
          plannedHours: 0,
          completedHours: 0,
          isCompleted: false,
          topics: [] // Starts empty!
        };
        currentUnits.push(newUnit);
      }

      await updateSubjectUnits(activeSubject.id, currentUnits);
      setIsUnitModalOpen(false);
      showNotification('success', editingUnit ? 'Unit updated.' : 'Unit added to syllabus builder.');
    } catch (err: any) {
      showNotification('error', 'Failed to save unit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Topic Modal
  const openTopicModal = (unitId: string, topic?: SyllabusTopic) => {
    setActiveUnitIdForTopic(unitId);
    if (topic) {
      setEditingTopic({ topic, unitId });
      setTopicTitle(topic.title);
      setTopicDescription(topic.description || '');
      setTopicHours(topic.hours || 2);
    } else {
      setEditingTopic(null);
      setTopicTitle('');
      setTopicDescription('');
      setTopicHours(2);
    }
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !activeUnitIdForTopic || !topicTitle.trim()) {
      showNotification('error', 'Topic title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUnits = activeSubject.units.map(unit => {
        if (unit.id !== activeUnitIdForTopic) return unit;

        let topics = [...(unit.topics || [])];
        if (editingTopic) {
          topics = topics.map(t => {
            if (t.id === editingTopic.topic.id) {
              return {
                ...t,
                title: topicTitle.trim(),
                description: topicDesc.trim(),
                hours: Number(topicHours) || 1
              };
            }
            return t;
          });
        } else {
          const newTopic: SyllabusTopic = {
            id: `t-${Date.now()}`,
            title: topicTitle.trim(),
            description: topicDesc.trim(),
            hours: Number(topicHours) || 1,
            completed: false
          };
          topics.push(newTopic);
        }

        const completedCount = topics.filter(t => t.completed).length;
        const allCompleted = topics.length > 0 && completedCount === topics.length;

        return {
          ...unit,
          topics,
          isCompleted: allCompleted
        };
      });

      await updateSubjectUnits(activeSubject.id, updatedUnits);
      setIsTopicModalOpen(false);
      showNotification('success', editingTopic ? 'Topic updated.' : 'Topic added to unit syllabus.');
    } catch (err) {
      showNotification('error', 'Failed to save topic.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Topic Completion Toggle
  const handleToggleTopic = async (unitId: string, topicId: string, currentCompleted: boolean) => {
    if (!activeSubject || !canEditCoverage) return;
    try {
      await toggleSyllabusTopic(activeSubject.id, unitId, topicId, !currentCompleted);
      showNotification('success', !currentCompleted ? 'Topic marked as completed.' : 'Topic marked as pending.');
    } catch (err) {
      showNotification('error', 'Failed to update topic status.');
    }
  };

  // Delete Handlers
  const confirmDelete = async () => {
    if (!deleteConfirmId || !activeSubject) return;
    try {
      if (deleteConfirmId.type === 'subject') {
        await deleteSubject(deleteConfirmId.id);
        showNotification('success', 'Subject removed from curriculum.');
      } else if (deleteConfirmId.type === 'unit') {
        const updatedUnits = activeSubject.units.filter(u => u.id !== deleteConfirmId.id);
        await updateSubjectUnits(activeSubject.id, updatedUnits);
        showNotification('success', 'Unit removed from syllabus.');
      } else if (deleteConfirmId.type === 'topic' && deleteConfirmId.parentId) {
        const updatedUnits = activeSubject.units.map(u => {
          if (u.id !== deleteConfirmId.parentId) return u;
          return {
            ...u,
            topics: u.topics.filter(t => t.id !== deleteConfirmId.id)
          };
        });
        await updateSubjectUnits(activeSubject.id, updatedUnits);
        showNotification('success', 'Topic removed from unit.');
      }
      setDeleteConfirmId(null);
    } catch (err) {
      showNotification('error', 'Failed to delete item.');
    }
  };

  // --- Unit Study Notes Operations ---
  const handleNoteFileChange = (file: File | null) => {
    if (!file) {
      setSelectedNoteFile(null);
      setFileValidationError(null);
      return;
    }
    const val = validateNoteFile(file);
    if (!val.valid) {
      setSelectedNoteFile(null);
      setFileValidationError(val.error || 'Invalid file');
      return;
    }
    setFileValidationError(null);
    setSelectedNoteFile(file);
    if (!noteTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setNoteTitle(cleanName);
    }
  };

  const handleUploadNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTargetUnit || !activeSubject) {
      showNotification('error', 'Academic unit context is missing.');
      return;
    }
    if (!selectedNoteFile) {
      setFileValidationError('Please select a file to upload.');
      return;
    }
    const val = validateNoteFile(selectedNoteFile);
    if (!val.valid) {
      setFileValidationError(val.error || 'Invalid file');
      return;
    }

    setIsUploadingNote(true);
    setUploadProgress(25);

    try {
      const matchedSection = sections.find(
        sec => sec.departmentCode === activeSubject.departmentCode &&
          sec.sectionName.toUpperCase() === (activeSubject.section || 'A').toUpperCase()
      );
      const classroomId = (activeSubject as any).classroomId || matchedSection?.id || `sec-${activeSubject.section || 'A'}`;
      const departmentId = (activeSubject as any).departmentId || (departments.find(d => d.code === activeSubject.departmentCode || d.name === activeSubject.department)?.id) || activeSubject.departmentCode || 'general';

      setUploadProgress(50);

      const { downloadUrl, storagePath } = await uploadUnitNoteFile(selectedNoteFile, {
        departmentId,
        classroomId,
        subjectId: activeSubject.id,
        unitId: uploadTargetUnit.id
      });

      setUploadProgress(85);

      const notePayload: Omit<MasterNote, 'id'> = {
        title: noteTitle.trim() || selectedNoteFile.name,
        description: noteDescription.trim(),
        department: activeSubject.department,
        departmentCode: activeSubject.departmentCode || '',
        departmentId,
        classroomId,
        unitId: uploadTargetUnit.id, // Stable unit ID
        academicYear: String(activeSubject.year || 2),
        year: activeSubject.year || Math.ceil((activeSubject.semester || 1) / 2),
        semester: activeSubject.semester || 1,
        section: activeSubject.section || 'A',
        subjectId: activeSubject.id,
        subjectCode: activeSubject.code,
        subjectName: activeSubject.name,
        unitOrTopic: `Unit ${uploadTargetUnit.unitNumber}: ${uploadTargetUnit.title}`,
        materialType: noteMaterialType,
        fileUrl: downloadUrl,
        fileName: selectedNoteFile.name,
        fileSize: formatFileSize(selectedNoteFile.size),
        fileType: selectedNoteFile.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
        storagePath,
        uploadedBy: currentUser?.id || 'faculty',
        uploadedByName: currentUser?.name || 'Course Faculty',
        uploadedByEmail: currentUser?.email || '',
        uploadedByRole: (currentRole as any) || 'faculty',
        uploadedAt: new Date().toISOString()
      };

      await createNote(notePayload);

      setUploadProgress(100);
      showNotification('success', 'Notes uploaded successfully.');

      setIsUploadNoteModalOpen(false);
      setSelectedNoteFile(null);
      setNoteTitle('');
      setNoteDescription('');
      setNoteMaterialType('Lecture Notes');
      setFileValidationError(null);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to upload note.');
    } finally {
      setIsUploadingNote(false);
      setUploadProgress(0);
    }
  };

  const handleViewNote = (note: MasterNote) => {
    if (!note.fileUrl) {
      showNotification('error', 'Note file URL is not available.');
      return;
    }
    window.open(note.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadNote = (note: MasterNote) => {
    if (!note.fileUrl) {
      showNotification('error', 'Note file URL is not available.');
      return;
    }
    const link = document.createElement('a');
    link.href = note.fileUrl;
    link.download = note.fileName || `${note.title}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveEditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    try {
      setIsSubmitting(true);
      await updateNote(editingNote.id, {
        title: editNoteTitle.trim(),
        description: editNoteDesc.trim(),
        materialType: editNoteMaterialType,
        updatedAt: new Date().toISOString()
      });
      showNotification('success', 'Note details updated.');
      setIsEditNoteModalOpen(false);
      setEditingNote(null);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to update note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplaceFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingNote || !replaceFile) return;
    const val = validateNoteFile(replaceFile);
    if (!val.valid) {
      showNotification('error', val.error || 'Invalid file.');
      return;
    }
    try {
      setIsSubmitting(true);
      const { downloadUrl, storagePath } = await uploadUnitNoteFile(replaceFile, {
        departmentId: replacingNote.departmentId,
        classroomId: replacingNote.classroomId,
        subjectId: replacingNote.subjectId,
        unitId: replacingNote.unitId
      });

      if (replacingNote.storagePath) {
        await deleteUnitNoteFile(replacingNote.storagePath);
      }

      await updateNote(replacingNote.id, {
        fileUrl: downloadUrl,
        storagePath,
        fileName: replaceFile.name,
        fileSize: formatFileSize(replaceFile.size),
        fileType: replaceFile.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
        updatedAt: new Date().toISOString()
      });

      showNotification('success', `File for "${replacingNote.title}" replaced successfully.`);
      setIsReplaceModalOpen(false);
      setReplacingNote(null);
      setReplaceFile(null);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to replace file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (note: MasterNote) => {
    if (!window.confirm(`Are you sure you want to delete note "${note.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      setIsSubmitting(true);
      if (note.storagePath) {
        await deleteUnitNoteFile(note.storagePath);
      }
      await deleteNote(note.id);
      showNotification('success', `Note "${note.title}" deleted.`);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to delete note.');
    } finally {
      setIsSubmitting(false);
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

      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-lg border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#4F46E5] border border-indigo-200 flex items-center justify-center shrink-0">
            <BookOpenCheck className="w-5 h-5 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#0F172A]">
              Syllabus Coverage & Curriculum Builder
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Unit-wise topic coverage, contact hours adherence, and statutory accreditation audit logs
            </p>
          </div>
        </div>

        {canManageSubjects && (
          <button
            onClick={() => openSubjectModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Create Course Subject
          </button>
        )}
      </div>

      {/* Filter Bar (Department, Year, Semester, Section, Search) */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Curriculum Search & Hierarchical Filters</span>
          </div>
          {(filterDept !== 'all' || filterYear !== 'all' || filterSem !== 'all' || filterSection !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterDept('all');
                setFilterYear('all');
                setFilterSem('all');
                setFilterSection('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-semibold text-[#4F46E5] hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* 1. Department Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department / Branch</label>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="w-full text-xs p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.code}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Academic Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="w-full text-xs p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="all">All Years (1st - 4th)</option>
              <option value="1">1st Year (UG)</option>
              <option value="2">2nd Year (UG)</option>
              <option value="3">3rd Year (UG)</option>
              <option value="4">4th Year (UG)</option>
            </select>
          </div>

          {/* 3. Semester Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Semester</label>
            <select
              value={filterSem}
              onChange={e => setFilterSem(e.target.value)}
              className="w-full text-xs p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="all">All Semesters (1 - 8)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          {/* 4. Section Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Section</label>
            <select
              value={filterSection}
              onChange={e => setFilterSection(e.target.value)}
              className="w-full text-xs p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="all">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          {/* 5. Subject Search Input */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Subject</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Code or title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-2 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main View: Empty State or Subject Selector & Syllabus Builder */}
      {accessibleSubjects.length === 0 ? (
        /* Empty State: 0 Accessible Subjects for Current Role */
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] mb-1">
            {isFaculty || isLabAssistant ? 'No Subjects Currently Assigned' : '0 Course Subjects Created'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-5">
            {isFaculty || isLabAssistant
              ? `You currently do not have any assigned courses in ${currentUser?.departmentCode || 'your department'}. Please contact your Head of Department or Institutional Administrator to allocate your subjects.`
              : 'The institutional curriculum directory has no registered course subjects. Establish real academic subjects to define unit topics and track coverage.'}
          </p>
          {canManageSubjects && (
            <button
              onClick={() => openSubjectModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Create First Course Subject
            </button>
          )}
        </div>
      ) : matchingSubjects.length === 0 ? (
        /* Empty State: Filters Returned 0 Matches */
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center shadow-xs">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#0F172A]">No Subjects Match Filter Criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed mb-4">
            No course subjects found matching your selected department, semester, section, or search query.
          </p>
          <button
            onClick={() => {
              setFilterDept('all');
              setFilterYear('all');
              setFilterSem('all');
              setFilterSection('all');
              setSearchQuery('');
            }}
            className="px-3.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs cursor-pointer"
          >
            Clear Filter Controls
          </button>
        </div>
      ) : (
        /* Active View: Subject Selector Tabs & Full Syllabus Builder */
        <div className="space-y-5">
          {!isSubjectAuthorized && activeSubject && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-950 text-sm">Subject Access Restricted</h3>
                <p className="mt-1 text-red-800 leading-relaxed">
                  You are not assigned to manage course &apos;{activeSubject.name}&apos; ({activeSubject.code}). Under institutional security policies, faculty and lab assistants can only view, edit, and track syllabus coverage for their explicitly assigned subjects.
                </p>
              </div>
            </div>
          )}

          {/* Subject Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-1.5 border-b border-[#E2E8F0]">
            {matchingSubjects.map(sub => {
              const isActive = sub.id === activeSubject?.id;
              const metrics = computeSubjectMetrics(sub);

              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`px-3.5 py-2 rounded-md font-medium text-xs whitespace-nowrap transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-2xs font-semibold'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2E8F0]'
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold opacity-90">{sub.code}:</span>
                  <span className="truncate max-w-[160px]">{sub.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-[#4F46E5] border border-indigo-200'
                    }`}
                  >
                    {metrics.topicCoveragePct}%
                  </span>
                </button>
              );
            })}
          </div>

          {activeSubject && (
            /* Selected Subject Workspace */
            <div className="space-y-5">
              {/* Subject Detail Header Card */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-2xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-xs">
                        {activeSubject.code}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[#4F46E5] font-bold text-xs capitalize">
                        {activeSubject.type} Course
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {activeSubject.department} • Year {activeSubject.year || Math.ceil((activeSubject.semester || 1) / 2)} (Sem {activeSubject.semester}) • Sec {activeSubject.section || 'A'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">• {activeSubject.credits} Credits</span>
                    </div>

                    <h2 className="text-lg font-bold text-[#0F172A] pt-1">
                      {activeSubject.name}
                    </h2>

                    {activeSubject.description && (
                      <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                        {activeSubject.description}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 pt-1">
                      Assigned Course Faculty: <strong className="text-slate-800">{activeSubject.facultyName || 'Unassigned'}</strong>
                    </p>
                  </div>

                  {/* Dynamic Progress Indicator & Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] text-center min-w-[160px]">
                      <div className="text-2xl font-black font-mono text-[#4F46E5]">
                        {activeMetrics.topicCoveragePct}%
                      </div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Topic Coverage Ratio
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                        {activeMetrics.completedTopics} / {activeMetrics.totalTopics} Topics Completed
                      </p>
                    </div>

                    {canManageSubjects && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openSubjectModal(activeSubject)}
                          className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit Subject Metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Subject
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId({ type: 'subject', id: activeSubject.id })}
                          className="p-2 rounded bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Syllabus Builder Header & Units Listing */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
                  <div>
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#4F46E5]" />
                      Syllabus Units & Topic Breakdown ({activeMetrics.totalUnits} Units)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Check topics as they are conducted in lectures/labs to compute real-time syllabus coverage
                    </p>
                  </div>

                  {canEditCoverage && (
                    <button
                      onClick={() => openUnitModal()}
                      className="px-3.5 py-1.5 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      Add Syllabus Unit
                    </button>
                  )}
                </div>

                {/* Units List */}
                {(!activeSubject.units || activeSubject.units.length === 0) ? (
                  <div className="p-10 text-center text-slate-500">
                    <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-800">No Syllabus Units Added Yet</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                      This subject currently has no units or topics defined. Use the Syllabus Builder button below to establish Unit 1, Unit 2, etc. and add topics.
                    </p>
                    {canEditCoverage && (
                      <button
                        onClick={() => openUnitModal()}
                        className="px-3.5 py-1.5 rounded bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        Add First Unit
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {activeSubject.units.map(unit => {
                      const isExpanded = expandedUnitIds[unit.id] !== false; // expanded by default
                      const unitTotalTopics = unit.topics?.length || 0;
                      const unitCompletedTopics = unit.topics ? unit.topics.filter(t => t.completed).length : 0;
                      const unitCoveragePct = unitTotalTopics > 0 ? Math.round((unitCompletedTopics / unitTotalTopics) * 100) : 0;
                      const unitNotes = notes.filter(n =>
                        n.subjectId === activeSubject.id &&
                        (n.unitId === unit.id || (!n.unitId && n.unitOrTopic?.includes(`Unit ${unit.unitNumber}`)))
                      );

                      return (
                        <div key={unit.id} className="bg-white">
                          {/* Unit Header Bar */}
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors border-l-4 border-l-[#4F46E5]">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleUnitExpand(unit.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 mt-0.5 cursor-pointer"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-xs text-[#0F172A] uppercase tracking-wider">
                                    Unit {unit.unitNumber}: {unit.title}
                                  </span>
                                  <span
                                    className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                      unitCoveragePct === 100
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : unitCoveragePct > 0
                                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {unitCoveragePct}% Covered ({unitCompletedTopics}/{unitTotalTopics} Topics)
                                  </span>

                                  {/* Unit-wise Notes Count Indicator (Requirement 10) */}
                                  <span
                                    className={`px-2 py-0.2 rounded text-[10px] font-bold flex items-center gap-1 ${
                                      unitNotes.length > 0
                                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}
                                    title={`${unitNotes.length} notes available for Unit ${unit.unitNumber}`}
                                  >
                                    <FileText className="w-3 h-3" />
                                    {unitNotes.length > 0 ? `${unitNotes.length} Note${unitNotes.length === 1 ? '' : 's'}` : 'No notes available'}
                                  </span>
                                </div>
                                {unit.description && (
                                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {unit.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              {/* Unit-wise Upload Notes Action (Requirement 1 & 4) */}
                              {canManageNotes && (
                                <button
                                  onClick={() => {
                                    setUploadTargetUnit(unit);
                                    setSelectedNoteFile(null);
                                    setNoteTitle('');
                                    setNoteDescription('');
                                    setNoteMaterialType('Lecture Notes');
                                    setFileValidationError(null);
                                    setIsUploadNoteModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-emerald-300"
                                  title={`Upload study notes for Unit ${unit.unitNumber}`}
                                >
                                  <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                                  Upload Notes
                                </button>
                              )}

                              {canEditCoverage && (
                                <button
                                  onClick={() => openTopicModal(unit.id)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] rounded font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add Topic
                                </button>
                              )}

                              {canManageSubjects && (
                                <>
                                  <button
                                    onClick={() => openUnitModal(unit)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                    title="Edit Unit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId({ type: 'unit', id: unit.id })}
                                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                    title="Delete Unit"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Unit Topics & Study Material Accordion */}
                          {isExpanded && (
                            <div className="bg-[#F8FAFC] border-t border-slate-100 px-4 py-3 space-y-4">
                              {/* 1. Topics Breakdown */}
                              <div>
                                <h6 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                                  Curriculum Topics ({unitCompletedTopics}/{unitTotalTopics} Covered)
                                </h6>
                                {(!unit.topics || unit.topics.length === 0) ? (
                                  <div className="py-3 text-center text-slate-400 text-xs bg-white rounded border border-dashed border-slate-200">
                                    No topics added inside Unit {unit.unitNumber} yet.{' '}
                                    {canEditCoverage && (
                                      <button
                                        onClick={() => openTopicModal(unit.id)}
                                        className="text-[#4F46E5] font-semibold hover:underline ml-1 cursor-pointer"
                                      >
                                        Add First Topic
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {unit.topics.map(topic => (
                                      <div
                                        key={topic.id}
                                        className={`p-3 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                          topic.completed
                                            ? 'bg-emerald-50/40 border-emerald-200'
                                            : 'bg-white border-slate-200'
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <button
                                            disabled={!canEditCoverage}
                                            onClick={() => handleToggleTopic(unit.id, topic.id, topic.completed)}
                                            className={`mt-0.5 p-0.5 rounded cursor-pointer transition-colors ${
                                              !canEditCoverage ? 'cursor-not-allowed opacity-60' : ''
                                            }`}
                                            title={canEditCoverage ? 'Click to toggle topic completion status' : 'View only'}
                                          >
                                            {topic.completed ? (
                                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                              <Square className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                            )}
                                          </button>

                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h5 className={`font-semibold text-xs ${topic.completed ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                                                {topic.title}
                                              </h5>
                                              <span className="text-[10px] text-slate-500 font-mono">
                                                ({topic.hours || 1} hrs)
                                              </span>
                                            </div>
                                            {topic.description && (
                                              <p className="text-[11px] text-slate-500 mt-0.5">
                                                {topic.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                          {topic.completed ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                                              Covered {topic.completionDate && `(${topic.completionDate})`}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                              Pending
                                            </span>
                                          )}

                                          {canEditCoverage && (
                                            <div className="flex items-center gap-1">
                                              <button
                                                onClick={() => openTopicModal(unit.id, topic)}
                                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                                title="Edit Topic"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => setDeleteConfirmId({ type: 'topic', id: topic.id, parentId: unit.id })}
                                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                                title="Delete Topic"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 2. Unit Study Material & Notes Section (Requirement 6, 8, 9, 11) */}
                              <div className="pt-3 border-t border-slate-200">
                                <div className="flex items-center justify-between mb-2.5">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#4F46E5]" />
                                    <h6 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                                      Unit Study Material & Notes ({unitNotes.length})
                                    </h6>
                                  </div>
                                  {canManageNotes && (
                                    <button
                                      onClick={() => {
                                        setUploadTargetUnit(unit);
                                        setSelectedNoteFile(null);
                                        setNoteTitle('');
                                        setNoteDescription('');
                                        setNoteMaterialType('Lecture Notes');
                                        setFileValidationError(null);
                                        setIsUploadNoteModalOpen(true);
                                      }}
                                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Upload Notes
                                    </button>
                                  )}
                                </div>

                                {unitNotes.length === 0 ? (
                                  <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-white text-center text-xs text-slate-500">
                                    <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                                    <p className="font-semibold text-slate-700">No study material uploaded for this unit yet.</p>
                                    {canManageNotes ? (
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        Upload PDFs, lecture slides, question banks, or handwritten notes for students of this section.
                                      </p>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        Your course instructor will upload study notes here as topics are completed.
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {unitNotes.map(note => {
                                      return (
                                        <div
                                          key={note.id}
                                          className="p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                                        >
                                          <div>
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex items-start gap-2.5 min-w-0">
                                                <div className="p-2 rounded bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                                                  {getFileIcon(note.fileName, note.fileType)}
                                                </div>
                                                <div className="min-w-0">
                                                  <h6 className="font-bold text-xs text-slate-900 truncate" title={note.title}>
                                                    {note.title}
                                                  </h6>
                                                  <p className="text-[11px] text-slate-500 truncate" title={note.fileName || 'Document'}>
                                                    {note.fileName || 'Attached file'}
                                                  </p>
                                                </div>
                                              </div>

                                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                                {note.materialType || 'Notes'}
                                              </span>
                                            </div>

                                            {note.description && (
                                              <div className="mt-2 p-2 rounded bg-slate-50/70 border border-slate-100 text-[11px] text-slate-600 leading-relaxed italic">
                                                "{note.description}"
                                              </div>
                                            )}

                                            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                                              <span className="truncate">
                                                By {note.uploadedByName} ({note.uploadedByRole})
                                              </span>
                                              <span className="shrink-0 font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                                {note.fileSize || 'N/A'}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Note Actions: Open, Download, Edit, Replace, Delete (Requirement 7 & 8) */}
                                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                onClick={() => handleViewNote(note)}
                                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                                title="View note in browser"
                                              >
                                                <Eye className="w-3 h-3" />
                                                Open
                                              </button>
                                              <button
                                                onClick={() => handleDownloadNote(note)}
                                                className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                                title="Download note file"
                                              >
                                                <Download className="w-3 h-3" />
                                                Download
                                              </button>
                                            </div>

                                            {canManageNotes && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => {
                                                    setEditingNote(note);
                                                    setEditNoteTitle(note.title);
                                                    setEditNoteDesc(note.description || '');
                                                    setEditNoteMaterialType(note.materialType || 'Lecture Notes');
                                                    setIsEditNoteModalOpen(true);
                                                  }}
                                                  className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                                  title="Edit Note Details"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setReplacingNote(note);
                                                    setIsReplaceModalOpen(true);
                                                    setReplaceFile(null);
                                                  }}
                                                  className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                                  title="Replace File"
                                                >
                                                  <RefreshCw className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteNote(note)}
                                                  className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                                  title="Delete Note"
                                                >
                                                  <Trash2 className="w-3 h-3" />
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
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. Create/Edit Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingSubject ? 'Edit Course Subject' : 'Create New Academic Subject'}
                </h3>
              </div>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DC Machines"
                    value={subName}
                    onChange={e => setSubName(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EE301"
                    value={subCode}
                    onChange={e => setSubCode(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department / Branch *</label>
                  <select
                    value={subDept}
                    onChange={e => setSubDept(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    {departments.length > 0 ? (
                      departments.map(d => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))
                    ) : (
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Faculty</label>
                  <select
                    value={subFacultyId}
                    onChange={e => setSubFacultyId(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="">Select Faculty Instructor</option>
                    {facultyUsers.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.designation || f.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Year</label>
                  <select
                    value={subYear}
                    onChange={e => setSubYear(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={subSemester}
                    onChange={e => setSubSemester(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={subSection}
                    onChange={e => setSubSection(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={subCredits}
                    onChange={e => setSubCredits(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-bold text-slate-900 text-center focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Type</label>
                <div className="flex gap-3 pt-1">
                  {(['theory', 'lab', 'integrated'] as const).map(t => (
                    <label key={t} className="flex items-center gap-1.5 cursor-pointer capitalize text-xs">
                      <input
                        type="radio"
                        name="subType"
                        checked={subType === t}
                        onChange={() => setSubType(t)}
                        className="text-[#4F46E5]"
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Description / Overview</label>
                <textarea
                  rows={3}
                  placeholder="Comprehensive course objectives and fundamental engineering outcomes..."
                  value={subDescription}
                  onChange={e => setSubDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create/Edit Unit Modal */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingUnit ? 'Edit Syllabus Unit' : 'Add Unit to Syllabus'}
                </h3>
              </div>
              <button
                onClick={() => setIsUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit #</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={unitNum}
                    onChange={e => setUnitNum(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-bold text-center text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Unit Name / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit 1: DC Generators & Magnetic Circuits"
                    value={unitTitle}
                    onChange={e => setUnitTitle(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit Description / Summary</label>
                <textarea
                  rows={3}
                  placeholder="Outline key concepts, mathematical models, or lab experiments covered in this unit..."
                  value={unitDesc}
                  onChange={e => setUnitDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving...' : editingUnit ? 'Update Unit' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create/Edit Topic Modal */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingTopic ? 'Edit Topic' : 'Add Topic to Unit'}
                </h3>
              </div>
              <button
                onClick={() => setIsTopicModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Topic Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Principle of Operation & Constructional Features"
                    value={topicTitle}
                    onChange={e => setTopicTitle(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hours</label>
                  <input
                    type="number"
                    min={1}
                    value={topicHours}
                    onChange={e => setTopicHours(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-bold text-center text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Topic Notes / Sub-topics</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Stator, rotor, commutator, brushes, wave and lap armature windings..."
                  value={topicDesc}
                  onChange={e => setTopicDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving...' : editingTopic ? 'Update Topic' : 'Add Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to remove this {deleteConfirmId.type}? All associated syllabus coverage metrics will be recalculated automatically.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Delete {deleteConfirmId.type}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Upload Unit Notes Modal (Requirements 1, 3, 4, 5, 12, 16, 17) */}
      {isUploadNoteModalOpen && uploadTargetUnit && activeSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[#4F46E5]" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Upload Notes — Unit {uploadTargetUnit.unitNumber}: {uploadTargetUnit.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeSubject.code} • {activeSubject.name} (Sec {activeSubject.section || 'A'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isUploadingNote) {
                    setIsUploadNoteModalOpen(false);
                    setSelectedNoteFile(null);
                  }
                }}
                disabled={isUploadingNote}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadNoteSubmit} className="p-5 space-y-4 text-xs">
              {/* File Dropzone / Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Document / Notes File <span className="text-red-500">*</span>
                </label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleNoteFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-lg p-5 text-center transition-all ${
                    selectedNoteFile
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    id="unit-note-file-input"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleNoteFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  {selectedNoteFile ? (
                    <div className="flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded bg-white border border-emerald-200">
                          {getFileIcon(selectedNoteFile.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 truncate max-w-xs">{selectedNoteFile.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {formatFileSize(selectedNoteFile.size)} • {selectedNoteFile.name.split('.').pop()?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <label
                        htmlFor="unit-note-file-input"
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 rounded cursor-pointer shrink-0"
                      >
                        Change File
                      </label>
                    </div>
                  ) : (
                    <label htmlFor="unit-note-file-input" className="cursor-pointer block">
                      <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-slate-800">
                        Click to browse or drag and drop study notes file
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, Images (Max 25 MB)
                      </p>
                    </label>
                  )}
                </div>
                {fileValidationError && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fileValidationError}
                  </p>
                )}
              </div>

              {/* Note Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Note Display Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 1 — Magnetic Circuit Principles & Solved Examples"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-white font-medium text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              {/* Material Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Category</label>
                <select
                  value={noteMaterialType}
                  onChange={e => setNoteMaterialType(e.target.value as MaterialType)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-white font-medium text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Question Bank">Question Bank / Important Questions</option>
                  <option value="Lab Manual">Lab Manual / Practical Guide</option>
                  <option value="Reference Material">Reference Material</option>
                  <option value="Assignment">Assignment / Problem Set</option>
                  <option value="Syllabus Copy">Syllabus Copy</option>
                </select>
              </div>

              {/* Optional Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Optional Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Class notes covering MMF, reluctance, flux and solved numerical problems from lecture."
                  value={noteDescription}
                  onChange={e => setNoteDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-white font-medium text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This note will be strictly accessible to students of {activeSubject.department} Sec {activeSubject.section || 'A'}.
                </p>
              </div>

              {/* Upload Progress Bar (Requirement 4 & 17) */}
              {isUploadingNote && (
                <div className="space-y-1.5 p-3 rounded-lg bg-indigo-50/70 border border-indigo-100">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Uploading… {uploadProgress}%
                    </span>
                    <span>Please wait...</span>
                  </div>
                  <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUploadingNote}
                  onClick={() => {
                    setIsUploadNoteModalOpen(false);
                    setSelectedNoteFile(null);
                  }}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingNote || !selectedNoteFile}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                  {isUploadingNote ? `Uploading… ${uploadProgress}%` : 'Upload Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Note Details Modal (Requirement 7) */}
      {isEditNoteModalOpen && editingNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-sm">Edit Note Details</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditNoteModalOpen(false);
                  setEditingNote(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditNote} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editNoteTitle}
                  onChange={e => setEditNoteTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-white font-medium text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Category</label>
                <select
                  value={editNoteMaterialType}
                  onChange={e => setEditNoteMaterialType(e.target.value as MaterialType)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-white font-medium text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Question Bank">Question Bank / Important Questions</option>
                  <option value="Lab Manual">Lab Manual / Practical Guide</option>
                  <option value="Reference Material">Reference Material</option>
                  <option value="Assignment">Assignment / Problem Set</option>
                  <option value="Syllabus Copy">Syllabus Copy</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editNoteDesc}
                  onChange={e => setEditNoteDesc(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-white font-medium text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditNoteModalOpen(false);
                    setEditingNote(null);
                  }}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Replace Note File Modal (Requirement 7) */}
      {isReplaceModalOpen && replacingNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-sm">Replace Document File</h3>
              </div>
              <button
                onClick={() => {
                  setIsReplaceModalOpen(false);
                  setReplacingNote(null);
                  setReplaceFile(null);
                }}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReplaceFileSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <p className="text-slate-600 mb-1">
                  Current Document: <strong className="text-slate-900">{replacingNote.fileName || replacingNote.title}</strong>
                </p>
                <p className="text-[11px] text-slate-400 mb-3">
                  Uploading a new file will safely replace the existing Storage file without leaving orphaned files.
                </p>

                <label className="block font-semibold text-slate-700 mb-1.5">Select Replacement File *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      const val = validateNoteFile(f);
                      if (!val.valid) {
                        showNotification('error', val.error || 'Invalid file');
                        setReplaceFile(null);
                      } else {
                        setReplaceFile(f);
                      }
                    }
                  }}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-white font-medium text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                />
                {replaceFile && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Selected: {replaceFile.name} ({formatFileSize(replaceFile.size)})
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsReplaceModalOpen(false);
                    setReplacingNote(null);
                    setReplaceFile(null);
                  }}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !replaceFile}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  {isSubmitting ? 'Replacing...' : 'Upload & Replace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
