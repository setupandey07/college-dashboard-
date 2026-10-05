import {
  UserProfile,
  DepartmentInfo,
  Subject,
  AttendanceSession,
  StudentSubjectAttendance,
  AssessmentRecord,
  StudentSubjectMarks,
  WorkloadItem,
  AcademicQuery,
  InnovationProject,
  Announcement,
  LabEquipment
} from '../types';

export const INITIAL_USERS: UserProfile[] = [];

// Pure dynamic data: zero hardcoded academic departments
export const INITIAL_DEPARTMENTS: DepartmentInfo[] = [];

// Pure dynamic data: zero hardcoded academic subjects
export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_ATTENDANCE_SESSIONS: AttendanceSession[] = [];

export const INITIAL_STUDENT_ATTENDANCE: StudentSubjectAttendance[] = [];

export const INITIAL_ASSESSMENTS: AssessmentRecord[] = [];

export const INITIAL_STUDENT_MARKS: StudentSubjectMarks[] = [];

export const INITIAL_WORKLOADS: WorkloadItem[] = [];

export const INITIAL_QUERIES: AcademicQuery[] = [];

export const INITIAL_INNOVATION_PROJECTS: InnovationProject[] = [];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export const INITIAL_LAB_EQUIPMENT: LabEquipment[] = [];
