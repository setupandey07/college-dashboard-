import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Building2,
  Calendar,
  User,
  Briefcase,
  Phone,
  MapPin,
  Sparkles,
  BookOpen,
  Layers,
  Search,
  CheckSquare,
  Square,
  X,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicData } from '../../context/AcademicDataContext';
import { UserProfile, Subject } from '../../types';

export const CompleteProfilePage: React.FC = () => {
  const { currentUser, actualRole, updateCurrentUserProfile, logout } = useAuth();
  const {
    departments: dbDepartments,
    sections: dbSections,
    subjects: dbSubjects,
    updateSubject
  } = useAcademicData();

  const availableDepts = dbDepartments || [];

  const isStudent = currentUser.role === 'student' || actualRole === 'student';
  const isLabAssistant = currentUser.role === 'lab_assistant' || actualRole === 'lab_assistant';
  const isFaculty = currentUser.role === 'faculty' || actualRole === 'faculty';
  const isHod = currentUser.role === 'hod' || actualRole === 'hod';
  const isStaff = isFaculty || isLabAssistant || isHod;

  // 1. Academic Department Selection (Never default to CSE for new users)
  const initialDeptCode = currentUser.departmentCode && currentUser.departmentCode !== 'UNASSIGNED' ? currentUser.departmentCode : '';
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>(initialDeptCode);

  // Student specific placement
  const [selectedYear, setSelectedYear] = useState<string>(currentUser.currentAcademicYear || '');
  const [selectedSemester, setSelectedSemester] = useState<string>(
    currentUser.semester && currentUser.semester > 0 ? String(currentUser.semester) : ''
  );
  const [selectedSection, setSelectedSection] = useState<string>(currentUser.section || '');

  // 2. Faculty / Lab Assistant Multi-Subject Selection
  const initialAssigned = currentUser.assignedSubjectIds && currentUser.assignedSubjectIds.length > 0
    ? currentUser.assignedSubjectIds
    : (currentUser.assignedSubjectId ? [currentUser.assignedSubjectId] : []);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(initialAssigned);
  const [subjectSearch, setSubjectSearch] = useState<string>('');

  // 3. Personal & Contact Details
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser.dateOfBirth || '');
  const [gender, setGender] = useState<UserProfile['gender']>(currentUser.gender || 'prefer_not_to_say');
  const [address, setAddress] = useState(currentUser.address || '');
  const [emergencyContact, setEmergencyContact] = useState(currentUser.emergencyContact || '');

  // 4. Student Guardian Details
  const [guardianName, setGuardianName] = useState(currentUser.guardianName || currentUser.parentName || '');
  const [guardianContact, setGuardianContact] = useState(currentUser.guardianContact || currentUser.parentPhone || '');
  const [admissionYear, setAdmissionYear] = useState<string>(
    currentUser.admissionYear && Number(currentUser.admissionYear) > 2000
      ? String(currentUser.admissionYear)
      : String(new Date().getFullYear() - (Number(selectedYear.charAt(0)) || 1) + 1)
  );

  // 5. Faculty / HOD / Lab Assistant Credentials
  const [qualification, setQualification] = useState(currentUser.qualification || '');
  const [specialization, setSpecialization] = useState(currentUser.specialization || '');
  const [experience, setExperience] = useState(currentUser.experience || '');
  const [officeRoomNumber, setOfficeRoomNumber] = useState(currentUser.officeRoomNumber || '');
  const [officialContact, setOfficialContact] = useState(currentUser.officialContact || '');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic department-driven subjects directly from Firestore database (Strict Department Isolation)
  const departmentSubjects = useMemo(() => {
    if (!selectedDeptCode) return [];
    const deptUpper = selectedDeptCode.toUpperCase().trim();
    const chosenDept = availableDepts.find(d => d.code.toUpperCase() === deptUpper);
    const deptName = chosenDept?.name?.toLowerCase().trim() || '';

    return (dbSubjects || []).filter(s => {
      const subDeptCode = (s.departmentCode || '').toUpperCase().trim();
      const subDeptName = (s.department || '').toLowerCase().trim();
      return (
        (deptUpper && subDeptCode === deptUpper) ||
        (deptName && (subDeptName === deptName || subDeptName.includes(deptUpper.toLowerCase())))
      );
    });
  }, [dbSubjects, selectedDeptCode, availableDepts]);

  // Filtered by user search
  const filteredDeptSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return departmentSubjects;
    const q = subjectSearch.toLowerCase().trim();
    return departmentSubjects.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [departmentSubjects, subjectSearch]);

  // Handle department change with strict isolation
  const handleDepartmentChange = (deptCode: string) => {
    setSelectedDeptCode(deptCode);
    // Reset selected subjects when department changes so faculty never has cross-department subjects
    setSelectedSubjectIds([]);
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const selectAllSubjects = () => {
    setSelectedSubjectIds(departmentSubjects.map(s => s.id));
  };

  const clearAllSubjects = () => {
    setSelectedSubjectIds([]);
  };

  // Dynamic semester options based on chosen academic year without auto-defaulting
  const getSemesterOptions = () => {
    switch (selectedYear) {
      case '1st Year':
        return [
          { value: '1', label: '1st Semester' },
          { value: '2', label: '2nd Semester' }
        ];
      case '2nd Year':
        return [
          { value: '3', label: '3rd Semester' },
          { value: '4', label: '4th Semester' }
        ];
      case '3rd Year':
        return [
          { value: '5', label: '5th Semester' },
          { value: '6', label: '6th Semester' }
        ];
      case '4th Year':
        return [
          { value: '7', label: '7th Semester' },
          { value: '8', label: '8th Semester' }
        ];
      default:
        return [
          { value: '1', label: '1st Semester' },
          { value: '2', label: '2nd Semester' },
          { value: '3', label: '3rd Semester' },
          { value: '4', label: '4th Semester' },
          { value: '5', label: '5th Semester' },
          { value: '6', label: '6th Semester' },
          { value: '7', label: '7th Semester' },
          { value: '8', label: '8th Semester' }
        ];
    }
  };

  // Dynamic sections from database matching selected department and academic year
  const dbMatchedSections = (dbSections || []).filter(s =>
    s.status !== 'inactive' &&
    (!selectedDeptCode || s.departmentCode?.toUpperCase() === selectedDeptCode.toUpperCase()) &&
    (!selectedYear || s.academicYear === selectedYear)
  );

  const availableSectionOptions = Array.from(
    new Set([
      ...dbMatchedSections.map(s => s.sectionName),
      'Section A',
      'Section B',
      'Section C',
      'B'
    ])
  );

  const handleYearChange = (yearVal: string) => {
    setSelectedYear(yearVal);
    setSelectedSemester('');
    if (yearVal) {
      const yrNum = Number(yearVal.charAt(0)) || 1;
      setAdmissionYear(String(new Date().getFullYear() - yrNum + 1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validate Academic Placement
    if (!selectedDeptCode) {
      setErrorMessage('Please select your academic Department. Academic placement cannot be unassigned.');
      return;
    }

    const chosenDept = availableDepts.find(d => d.code.toUpperCase() === selectedDeptCode.toUpperCase());
    if (!chosenDept) {
      setErrorMessage('Please choose a valid department from the available list.');
      return;
    }

    if (isStudent) {
      if (!selectedYear) {
        setErrorMessage('Please select your Academic Year (e.g. 1st Year, 2nd Year).');
        return;
      }
      if (!selectedSemester || Number(selectedSemester) <= 0) {
        setErrorMessage('Please select your current Enrolled Semester.');
        return;
      }
      if (!selectedSection) {
        setErrorMessage('Please select your Assigned Section (e.g. Section A, Section B).');
        return;
      }
    } else if (isFaculty || isLabAssistant) {
      // For faculty / lab assistant, prompt if no subjects are selected
      if (departmentSubjects.length > 0 && selectedSubjectIds.length === 0) {
        setErrorMessage('Please select at least one course or laboratory subject you are responsible for.');
        return;
      }
    }

    // 2. Validate Personal & Contact Fields
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('A valid phone number is required to complete your profile.');
      return;
    }

    if (isStudent) {
      if (!dateOfBirth) {
        setErrorMessage('Date of birth is required for institutional student verification.');
        return;
      }
      if (!address.trim()) {
        setErrorMessage('Residential or campus hostel address is required.');
        return;
      }
      if (!guardianName.trim()) {
        setErrorMessage('Parent / Guardian full legal name is required.');
        return;
      }
      if (!guardianContact.trim()) {
        setErrorMessage('Parent / Guardian contact phone number is required.');
        return;
      }
    } else if (isStaff) {
      if (!qualification.trim()) {
        setErrorMessage('Highest educational qualification is required.');
        return;
      }
      if (!specialization.trim()) {
        setErrorMessage('Specialization / research or practical domain is required.');
        return;
      }
      if (!experience.trim()) {
        setErrorMessage('Academic / technical experience is required.');
        return;
      }
      if (!officeRoomNumber.trim()) {
        setErrorMessage(isLabAssistant ? 'Assigned Laboratory room or office number is required.' : 'Office / Room / Cabin number is required.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Resolve selected subject details
      const selectedSubjectObjs = (dbSubjects || []).filter(s => selectedSubjectIds.includes(s.id));
      const assignedNames = selectedSubjectObjs.map(s => s.name);
      const assignedCodes = selectedSubjectObjs.map(s => s.code);

      const updates: Partial<UserProfile> = {
        department: chosenDept.name,
        departmentCode: chosenDept.code,
        phone: cleanPhone,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || 'prefer_not_to_say',
        address: address.trim(),
        emergencyContact: emergencyContact.trim(),
        isProfileComplete: true
      };

      if (isStudent) {
        const semNum = Number(selectedSemester);
        updates.semester = semNum;
        updates.section = selectedSection;
        updates.currentAcademicYear = selectedYear;
        updates.admissionYear = admissionYear ? Number(admissionYear) : new Date().getFullYear();
        updates.parentName = guardianName.trim();
        updates.guardianName = guardianName.trim();
        updates.parentPhone = guardianContact.trim();
        updates.guardianContact = guardianContact.trim();
        updates.designation = `B.Tech ${chosenDept.code} - Semester ${semNum}`;
      } else {
        updates.qualification = qualification.trim();
        updates.specialization = specialization.trim();
        updates.experience = experience.trim();
        updates.officeRoomNumber = officeRoomNumber.trim();
        updates.officialContact = officialContact.trim();

        // Subject responsibilities stored authoritatively in Firebase user profile
        updates.assignedSubjectIds = selectedSubjectIds;
        updates.assignedSubjectNames = assignedNames;
        updates.assignedSubjectId = selectedSubjectIds[0] || '';
        updates.assignedSubjectName = assignedNames[0] || '';
        updates.assignedSubjectCode = assignedCodes[0] || '';
        updates.hasCompletedSubjectOnboarding = true;

        if (currentUser.role === 'hod') {
          updates.designation = `Professor & HOD (${chosenDept.code})`;
        } else if (currentUser.role === 'lab_assistant' || actualRole === 'lab_assistant') {
          updates.designation = `Technical Lab Assistant (${chosenDept.code})`;
        } else {
          updates.designation = `Assistant Professor (${chosenDept.code})`;
        }

        // Simultaneously associate faculty name with selected subjects if empty
        for (const sub of selectedSubjectObjs) {
          if (!sub.facultyId || sub.facultyId === 'u-fac-1' || sub.facultyName === 'Unassigned') {
            try {
              await updateSubject(sub.id, {
                facultyId: currentUser.id,
                facultyName: currentUser.name
              });
            } catch (_) {}
          }
        }
      }

      await updateCurrentUserProfile(updates);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to complete profile. Please verify your connection.');
      setIsSubmitting(false);
    }
  };

  const roleTitle = currentUser.role === 'student'
    ? 'Student'
    : currentUser.role === 'hod'
    ? 'Head of Department'
    : currentUser.role === 'lab_assistant'
    ? 'Lab Assistant'
    : 'Faculty Member';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Institutional Bar */}
      <header className="bg-[#0F172A] border-b border-slate-800 text-slate-300 py-2.5 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight">AcademicCore</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  NIT AP
                </span>
              </div>
              <p className="text-[10px] text-slate-400">National Institute of Technology Andhra Pradesh</p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-3xl bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="p-6 border-b border-[#E2E8F0] bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Step 1 of 1: Initial Onboarding
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    {roleTitle}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-white mt-1.5 tracking-tight">
                  {isFaculty || isLabAssistant
                    ? 'Faculty & Lab Assistant Subject Allocation'
                    : 'Complete Your Academic Profile'}
                </h1>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {isFaculty || isLabAssistant
                    ? 'Select your academic department and allocate the specific curriculum courses or laboratories you will be teaching and managing.'
                    : 'Welcome to AcademicCore. Set up your academic placement and personal details below.'}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-xs p-2.5 rounded-lg border border-white/10">
                <div className="w-10 h-10 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-400">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left text-xs min-w-0">
                  <p className="font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-300 truncate font-mono">{currentUser.regId || currentUser.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-950">Action Required</p>
                  <p className="text-[11px] text-red-800 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Section 1: Locked Institutional Identity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Verified Identity Records (Locked)</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Read-Only
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> Full Name
                  </label>
                  <div className="p-2 rounded bg-white border border-slate-200 font-semibold text-slate-800 truncate" title={currentUser.name}>
                    {currentUser.name}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> {isStudent ? 'Roll Number / USN' : 'Employee ID'}
                  </label>
                  <div className="p-2 rounded bg-white border border-slate-200 font-mono font-bold text-slate-800 truncate" title={currentUser.regId}>
                    {currentUser.regId || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> Institutional Email
                  </label>
                  <div className="p-2 rounded bg-white border border-slate-200 font-mono text-slate-700 truncate" title={currentUser.email}>
                    {currentUser.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Department Selection */}
            <div className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-100 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-[#4F46E5]" />
                  <span>Academic Department Selection <span className="text-red-500">*</span></span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Required
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Select your academic department. Available subjects and courses will be dynamically populated from the database for your selected discipline.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Department / Discipline <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDeptCode}
                  onChange={e => handleDepartmentChange(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-md border border-[#CBD5E1] bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="">-- Choose Department (e.g. EEE, CSE, ECE) --</option>
                  {availableDepts.map(dept => (
                    <option key={dept.code} value={dept.code}>
                      {dept.code} — {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student specific cohort selection */}
              {isStudent && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedYear}
                      onChange={e => handleYearChange(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-md border border-[#CBD5E1] bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    >
                      <option value="">-- Select Year --</option>
                      <option value="1st Year">1st Year (B.Tech)</option>
                      <option value="2nd Year">2nd Year (B.Tech)</option>
                      <option value="3rd Year">3rd Year (B.Tech)</option>
                      <option value="4th Year">4th Year (B.Tech)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Enrolled Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSemester}
                      onChange={e => setSelectedSemester(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-md border border-[#CBD5E1] bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    >
                      <option value="">-- Select Semester --</option>
                      {getSemesterOptions().map(sem => (
                        <option key={sem.value} value={sem.value}>
                          {sem.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Assigned Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSection}
                      onChange={e => setSelectedSection(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-md border border-[#CBD5E1] bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    >
                      <option value="">-- Select Section --</option>
                      {availableSectionOptions.map(secName => (
                        <option key={secName} value={secName}>
                          {secName.startsWith('Section') ? secName : `Section ${secName}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2.5: Subject Responsibility Selection (Faculty and Lab Assistant) */}
            {(isFaculty || isLabAssistant) && (
              <div className="p-4 rounded-lg bg-emerald-50/40 border border-emerald-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Subject Responsibility & Assignment <span className="text-red-500">*</span></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {selectedSubjectIds.length} {selectedSubjectIds.length === 1 ? 'Subject' : 'Subjects'} Selected
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600">
                  Select the subjects you are responsible for teaching or managing. Your role permissions (syllabus editing, attendance marking, and marks entry) will be strictly confined to these assigned subjects.
                </p>

                {!selectedDeptCode ? (
                  <div className="p-6 rounded-lg bg-white border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                    <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    <p className="font-semibold text-slate-700">Please Select Your Department First</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Curriculum subjects will be fetched directly from the database once a department is selected.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Search and Action Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder={`Search ${selectedDeptCode} subjects by name or code...`}
                          value={subjectSearch}
                          onChange={e => setSubjectSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={selectAllSubjects}
                          disabled={departmentSubjects.length === 0}
                          className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={clearAllSubjects}
                          disabled={selectedSubjectIds.length === 0}
                          className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Subjects Grid */}
                    {filteredDeptSubjects.length === 0 ? (
                      <div className="p-6 rounded-lg bg-white border border-slate-200 text-center text-xs text-slate-500">
                        <p className="font-bold text-slate-700">No Subjects Found in {selectedDeptCode}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {departmentSubjects.length === 0
                            ? `There are currently no subjects cataloged for ${selectedDeptCode} in the database. You may continue, and your HOD/Admin will allocate courses later.`
                            : 'No subjects matched your search filter.'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                        {filteredDeptSubjects.map(sub => {
                          const isSelected = selectedSubjectIds.includes(sub.id);
                          return (
                            <div
                              key={sub.id}
                              onClick={() => toggleSubject(sub.id)}
                              className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 fill-emerald-100 text-emerald-600" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200">
                                        {sub.code}
                                      </span>
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                          sub.type === 'lab'
                                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}
                                      >
                                        {sub.type}
                                      </span>
                                      <span className="text-[9px] font-medium text-slate-500">
                                        Sem {sub.semester}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-xs mt-1 leading-snug">
                                      {sub.name}
                                    </h4>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 pl-6 flex items-center justify-between text-[10px] text-slate-500">
                                <span>{sub.credits} Credits • {sub.totalHoursPlanned || 45} Hours</span>
                                {isSelected && (
                                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Assigned
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Selected Summary Chips */}
                    {selectedSubjectIds.length > 0 && (
                      <div className="p-2.5 rounded bg-white border border-emerald-200 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                          Assigned Responsibilities:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSubjectIds.map(sid => {
                            const foundSub = (dbSubjects || []).find(s => s.id === sid);
                            return (
                              <span
                                key={sid}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-medium text-[11px] border border-emerald-300"
                              >
                                <span>{foundSub?.name || sid}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSubject(sid);
                                  }}
                                  className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Personal & Contact Information */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                <User className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Personal & Professional Credentials (Required)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Contact Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Date of Birth {isStudent && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    required={isStudent}
                    className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                  />
                </div>
              </div>

              {isStudent && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Parent / Guardian Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Sharma"
                        value={guardianName}
                        onChange={e => setGuardianName(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Parent / Guardian Contact Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 94455 66778"
                        value={guardianContact}
                        onChange={e => setGuardianContact(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Admission Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="2024"
                        value={admissionYear}
                        onChange={e => setAdmissionYear(e.target.value)}
                        required
                        min={2018}
                        max={2030}
                        className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value as any)}
                        className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900 font-medium"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {isStaff && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Highest Educational Qualification <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={isLabAssistant ? 'e.g. Diploma / B.Tech in EEE' : 'e.g. Ph.D. / M.Tech in Electrical Engineering'}
                      value={qualification}
                      onChange={e => setQualification(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Specialization / Domain <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Power Systems, Machine Design, Embedded Systems"
                      value={specialization}
                      onChange={e => setSpecialization(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Experience (Years) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6 Years"
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isLabAssistant ? 'Assigned Lab Room / Office' : 'Office / Room / Cabin Number'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={isLabAssistant ? 'e.g. Power Electronics Lab - Room 102' : 'e.g. Cabin 204, Academic Block 2'}
                      value={officeRoomNumber}
                      onChange={e => setOfficeRoomNumber(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="text-xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Residential / Campus Address {isStudent && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  placeholder="Street Address, Hostel Block, Room Number"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  required={isStudent}
                  className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900"
                />
              </div>

              <div className="text-xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Emergency Contact Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 99887 76655"
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-slate-900 font-medium"
                />
              </div>
            </div>

            {/* Submission & Confirmation */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  By completing this onboarding, your credentials and subject responsibilities are committed to the institutional Firebase database. Future subject re-assignments are managed through your Head of Department.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Saving to Institutional Database...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Onboarding & Access Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center text-[10px] text-slate-500">
        AcademicCore Academic Portal • National Institute of Technology Andhra Pradesh • Protected Institutional System
      </footer>
    </div>
  );
};
