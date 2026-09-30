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


export const INITIAL_DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'dept-cse',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    hodName: 'Unassigned',
    hodEmail: '',
    facultyCount: 0,
    studentCount: 0,
    labsCount: 0,
    avgAttendance: 0,
    syllabusCompletion: 0,
    establishedYear: 2002
  },
  {
    id: 'dept-ece',
    code: 'ECE',
    name: 'Electronics & Communication Engineering',
    hodName: 'Unassigned',
    hodEmail: '',
    facultyCount: 0,
    studentCount: 0,
    labsCount: 0,
    avgAttendance: 0,
    syllabusCompletion: 0,
    establishedYear: 2004
  },
  {
    id: 'dept-it',
    code: 'IT',
    name: 'Information Technology',
    hodName: 'Unassigned',
    hodEmail: '',
    facultyCount: 0,
    studentCount: 0,
    labsCount: 0,
    avgAttendance: 0,
    syllabusCompletion: 0,
    establishedYear: 2008
  },
  {
    id: 'dept-aids',
    code: 'AI&DS',
    name: 'Artificial Intelligence & Data Science',
    hodName: 'Unassigned',
    hodEmail: '',
    facultyCount: 0,
    studentCount: 0,
    labsCount: 0,
    avgAttendance: 0,
    syllabusCompletion: 0,
    establishedYear: 2021
  },
  {
    id: 'dept-mech',
    code: 'MECH',
    name: 'Mechanical Engineering',
    hodName: 'Unassigned',
    hodEmail: '',
    facultyCount: 0,
    studentCount: 0,
    labsCount: 0,
    avgAttendance: 0,
    syllabusCompletion: 0,
    establishedYear: 2002
  },
  {
    id: 'dept-civil',
    code: 'CIVIL',
    name: 'Civil Engineering',
    hodName: 'Unassigned',
    hodEmail: '',
    facultyCount: 0,
    studentCount: 0,
    labsCount: 0,
    avgAttendance: 0,
    syllabusCompletion: 0,
    establishedYear: 2006
  }
];

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

