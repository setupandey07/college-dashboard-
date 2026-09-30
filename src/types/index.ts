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
  admissionYear?: number | string;
  currentAcademicYear?: string;

  // Faculty / HOD Specific Profile Fields
  qualification?: string;
  specialization?: string;
  experience?: string;
  officeRoomNumber?: string;
  officialContact?: string;
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
  date: string;
  slot: string;
  semester: number;
  section: string;
  batch?: string;
  topicCovered: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  records: StudentAttendanceStatus[];
}

export interface StudentSubjectAttendance {
  studentId?: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  facultyName: string;
  lastAttended?: string;
  status?: 'safe' | 'warning' | 'critical';
}

export interface StudentMarksEntry {
  studentId: string;
  studentName: string;
  usn: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  remarks?: string;
}

export interface AssessmentRecord {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  assessmentType: 'CIA-1' | 'CIA-2' | 'Model Exam' | 'Practical / Viva' | 'Assignment';
  semester: number;
  section: string;
  maxMarks: number;
  date: string;
  averageScore: number;
  entries: StudentMarksEntry[];
}

export interface StudentSubjectMarks {
  id?: string;
  studentId?: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  cia1: number;
  cia2: number;
  assignment: number;
  practical?: number;
  modelExam: number;
  totalInternal: number;
  maxInternal: number;
  grade: string;
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
  authorName: string;
  authorRole: UserRole;
  message: string;
  timestamp: string;
}

export interface AcademicQuery {
  id: string;
  ticketId: string;
  title: string;
  category: 'academic' | 'lab' | 'exam' | 'admin' | 'infrastructure';
  studentId: string;
  studentName: string;
  usn: string;
  department: string;
  createdAt: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  description: string;
  assignedTo?: string;
  replies: QueryReply[];
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
