export type UserRole = 'admin' | 'hod' | 'faculty' | 'lab_assistant' | 'student';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  departmentCode: string;
  avatar: string;
  phone: string;
  regId: string; // Employee ID or USN
  designation?: string; // e.g. "Professor & HOD", "Assistant Professor", "Lab Technician", "B.Tech Student"
  semester?: number; // for students (e.g. 5)
  section?: string; // for students (e.g. "A")
  joiningYear: string;
  status: 'active' | 'on_leave' | 'inactive';

  // Common Profile Fields
  isProfileComplete?: boolean;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyContact?: string;

  // Student Specific Profile Fields
  parentName?: string;
  parentPhone?: string;
  guardianName?: string;
  guardianContact?: string;
  admissionYear?: number | string;
  currentAcademicYear?: string;

  // Faculty / HOD / Lab Assistant Specific Profile Fields
  qualification?: string;
  specialization?: string;
  experience?: string;
  officeRoomNumber?: string;
  officialContact?: string;
  assignedSubjectId?: string;
  assignedSubjectName?: string;
  assignedSubjectCode?: string;
  assignedSubjectIds?: string[];
  assignedSubjectNames?: string[];
  hasCompletedSubjectOnboarding?: boolean;
  assignedYear?: string | number;
  assignedSection?: string;
}

export interface DepartmentInfo {
  id: string;
  code: string;
  name: string;
  hodName: string;
  hodEmail: string;
  facultyCount: number;
  studentCount: number;
  labsCount?: number;
  avgAttendance?: number;
  syllabusCompletion?: number;
  establishedYear?: number;
  description?: string;
  phone?: string;
  location?: string;
  status?: 'active' | 'inactive';
}

export interface SyllabusTopic {
  id: string;
  title: string;
  description?: string;
  hours: number;
  completed: boolean;
  completionDate?: string;
}

export interface SyllabusUnit {
  id: string;
  unitNumber: number;
  title: string;
  description?: string;
  plannedHours: number;
  completedHours: number;
  isCompleted: boolean;
  topics: SyllabusTopic[];
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department: string;
  departmentCode?: string;
  academicYear?: string;
  year?: number;
  semester: number;
  section?: string;
  classId?: string;
  credits: number;
  type: 'theory' | 'lab' | 'integrated';
  facultyId: string;
  facultyName: string;
  description?: string;
  totalHoursPlanned: number;
  hoursConducted: number;
  units: SyllabusUnit[];
  status: 'on_track' | 'behind_schedule' | 'completed';
}

export interface StudentAttendanceStatus {
  studentId: string;
  studentName: string;
  usn: string;
  status: 'present' | 'absent' | 'late';
}

export interface AttendanceSession {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  facultyName?: string;
  date: string;
  time?: string;
  slot: string;
  semester: number;
  year?: number;
  department?: string;
  departmentCode?: string;
  section: string;
  batch?: string;
  topicCovered: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  records: StudentAttendanceStatus[];
  classPhotoUrl?: string;
  classPhotoTimestamp?: string;
  classPhotoStoragePath?: string;
  status?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: any;
}

export interface StudentSubjectAttendance {
  id?: string;
  studentId?: string;
  usn?: string;
  studentName?: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  totalClasses: number;
  attendedClasses: number;
  absentClasses?: number;
  percentage: number;
  facultyName: string;
  lastAttended?: string;
  status?: 'safe' | 'warning' | 'critical';
}

export type AssessmentType = 'Minor 1' | 'Minor 2' | 'Mid Sem' | 'End Sem';

export interface StudentMarksEntry {
  studentId: string;
  studentName: string;
  usn: string;
  marksObtained: number | null;
  maxMarks: number;
  grade?: string | null;
  remarks?: string;
}

export interface AssessmentRecord {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  assessmentType: AssessmentType;
  departmentId?: string;
  departmentCode?: string;
  semester: number;
  year?: number;
  section: string;
  maxMarks: number;
  date: string;
  averageScore?: number | null;
  facultyId?: string;
  facultyName?: string;
  entries: StudentMarksEntry[];
}

export interface StudentSubjectMarks {
  id?: string;
  studentId: string;
  studentName?: string;
  rollNumber?: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  departmentId?: string;
  departmentCode?: string;
  year?: number;
  section?: string;
  semester?: number;
  minor1?: number | null;
  minor2?: number | null;
  midSem?: number | null;
  endSem?: number | null;
  total?: number | null;
  grade?: string | null;
  // Legacy optional fields for backward compatibility
  cia1?: number | null;
  cia2?: number | null;
  assignment?: number | null;
  practical?: number | null;
  modelExam?: number | null;
  totalInternal?: number | null;
  maxInternal?: number;
  updatedAt?: any;
}

export interface WorkloadItem {
  facultyId: string;
  facultyName: string;
  designation: string;
  department: string;
  targetWeeklyHours: number;
  currentWeeklyHours: number;
  lectureHours: number;
  labHours: number;
  tutorialHours: number;
  subjectsAssigned: {
    code: string;
    name: string;
    hours: number;
    type: 'lecture' | 'lab';
    semester: number;
    section: string;
  }[];
  status: 'optimal' | 'overload' | 'underload';
}

export interface QueryReply {
  id: string;
  senderId?: string;
  senderRole?: UserRole;
  senderName?: string;
  authorName: string; // backwards compatibility
  authorRole: UserRole; // backwards compatibility
  message: string;
  timestamp: string;
  createdAt?: any;
}

export interface AcademicQuery {
  id: string;
  ticketId: string;
  title: string;
  category: 'academic' | 'lab' | 'exam' | 'admin' | 'infrastructure';
  
  // Canonical Ownership & Sender Metadata
  createdByUserId: string; // Authenticated sender Firebase UID
  createdByRole: UserRole; // Sender role
  createdByName?: string; // Sender display name
  createdBy: string; // compatibility alias for sender UID
  studentId: string; // compatibility alias
  studentName: string; // compatibility alias
  senderEmail?: string;
  senderRole?: UserRole;
  usn: string; // sender regId / roll number
  senderDepartment?: string;

  // Canonical Recipient Information
  recipientUserId?: string; // Exact target recipient Firebase UID (Faculty, HOD, Admin)
  recipientRole?: UserRole;
  recipientName?: string;
  recipientType?: 'hod' | 'faculty' | 'lab_assistant' | 'admin' | 'specific_user';
  recipientDepartment?: string; // target department code (e.g. 'EEE', 'CSE')
  recipientId?: string; // compatibility alias for recipientUserId

  departmentId?: string; // Target department code / ID
  subjectId?: string; // Optional related subject ID
  subjectName?: string;
  classId?: string; // Optional class / section
  sectionId?: string;

  department: string;
  createdAt: string;
  updatedAt?: any;
  lastReadAt?: string;
  resolvedAt?: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  description: string;
  message?: string; // alias for description
  assignedTo?: string;
  replies: QueryReply[];
}

export interface AppNotification {
  id: string;
  recipientUserId: string; // Target user UID
  userId?: string; // alias for backwards compatibility
  senderUserId?: string;
  senderName?: string;
  targetRole?: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'warning' | 'success';
  isRead: boolean;
  linkTab?: string;
  relatedEntity?: 'query' | 'attendance' | 'timetable' | 'marks' | 'announcement';
  relatedEntityId?: string;
  createdAt?: any;
}

export interface InnovationProject {
  id: string;
  title: string;
  domain: string;
  abstract: string;
  leadStudent: string;
  usn: string;
  teamMembers: string[];
  mentorName: string;
  department: string;
  category: 'research' | 'patent' | 'hackathon' | 'capstone';
  status: 'ideation' | 'under_review' | 'approved' | 'funded';
  fundingAmount?: string;
  submittedDate: string;
  tags: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'urgent' | 'academic' | 'exam' | 'event' | 'circular';
  targetAudience: 'all' | 'faculty' | 'students' | 'lab';
  department?: string;
  authorName: string;
  authorRole: string;
  date: string;
  isPinned: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface LabEquipment {
  id: string;
  labName: string;
  department: string;
  equipmentName: string;
  assetCode: string;
  quantity: number;
  workingCount: number;
  maintenanceCount: number;
  lastServiced: string;
  status: 'operational' | 'maintenance' | 'critical';
  inCharge: string;
}

export interface AcademicBatch {
  id: string;
  name: string; // e.g. "2026 Batch", "2025 Batch", "2024 Batch", "2023 Batch"
  startYear: number;
  endYear: number;
  departmentCode?: string; // Optional if specific or institution-wide
  departmentName?: string;
  status: 'active' | 'archived';
  description?: string;
  createdAt?: string;
  updatedAt?: any;
}

export type MaterialType =
  | 'Lecture Notes'
  | 'Syllabus Copy'
  | 'Lab Manual'
  | 'Question Bank'
  | 'Reference Material'
  | 'Assignment';

export interface MasterNote {
  id: string;
  title: string;
  description: string;
  department: string; // e.g. "Electrical & Electronics Engineering"
  departmentCode: string; // e.g. "EEE"
  departmentId?: string;
  classroomId?: string;
  unitId?: string; // Stable SyllabusUnit ID
  batch?: string; // e.g. "2026 Batch"
  batchId?: string;
  academicYear: string; // e.g. "2025-2026"
  year: number; // 1, 2, 3, 4
  semester: number; // 1 to 8
  section?: string; // "Section A", "Section B", or "All Sections"
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  unitOrTopic: string; // e.g. "Unit 1: DC Machine Principles"
  materialType: MaterialType;
  fileUrl: string; // Reference URL, PDF preview, or cloud storage URL
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  storagePath?: string;
  uploadedBy: string; // UID of authenticated user
  uploadedByName: string; // Authenticated author name
  uploadedByEmail?: string;
  uploadedByRole: UserRole;
  uploadedAt: string; // ISO date timestamp
  updatedAt?: any;
  visibility?: 'college_wide' | 'department_only';
}
