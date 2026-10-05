import {
  UserProfile,
  UserRole,
  StudentSubjectAttendance,
  StudentSubjectMarks,
  AttendanceSession,
  Subject,
  DepartmentInfo,
  AcademicQuery,
  AssessmentRecord
} from '../../types';
import { AcademicSection } from '../firestore';
import { ClassTimetable } from '../firestore/timetables';

export type AcademicAiIntent =
  | 'student_attendance'
  | 'student_attendance_recovery'
  | 'student_missed_syllabus'
  | 'student_marks'
  | 'student_study_plan'
  | 'student_focus_areas'
  | 'faculty_student_risk'
  | 'faculty_attendance_issues'
  | 'faculty_class_performance'
  | 'faculty_mentees'
  | 'faculty_syllabus_coverage'
  | 'hod_department_summary'
  | 'hod_students_at_risk'
  | 'hod_attendance_risk'
  | 'hod_academic_risk'
  | 'hod_mentor_insights'
  | 'hod_queries_grievances'
  | 'admin_institution_summary'
  | 'admin_department_comparison'
  | 'admin_attendance_trends'
  | 'admin_academic_trends'
  | 'admin_mentor_program'
  | 'admin_student_concerns'
  | 'concept'
  | 'numerical'
  | 'coding'
  | 'career'
  | 'safety_violation'
  | 'general';

export interface ScopedAcademicContext {
  role: UserRole;
  user: UserProfile;
  threshold: number; // Institutional threshold (75% default)

  // Student specific scoped data
  student?: {
    resolvedAttendance: StudentSubjectAttendance[];
    overallAttendancePct: number;
    totalConducted: number;
    totalAttended: number;
    totalAbsent: number;
    isEligible: boolean;
    marks: StudentSubjectMarks[];
    classroom?: AcademicSection;
    timetable?: ClassTimetable;
    enrolledSubjects: Subject[];
    absentSessions: AttendanceSession[];
    queries: AcademicQuery[];
  };

  // Faculty specific scoped data
  faculty?: {
    assignedSubjects: Subject[];
    assignedClassrooms: AcademicSection[];
    assignedStudents: UserProfile[];
    mentees: UserProfile[];
    conductedSessions: AttendanceSession[];
    studentAttendanceRecords: StudentSubjectAttendance[];
    studentMarksRecords: StudentSubjectMarks[];
    queries: AcademicQuery[];
  };

  // HOD specific scoped data (STRICT DEPARTMENT ISOLATION)
  hod?: {
    departmentCode: string;
    departmentName: string;
    departmentInfo?: DepartmentInfo;
    students: UserProfile[];
    faculty: UserProfile[];
    classrooms: AcademicSection[];
    subjects: Subject[];
    sessions: AttendanceSession[];
    studentAttendanceSummaries: StudentSubjectAttendance[];
    marks: StudentSubjectMarks[];
    queries: AcademicQuery[];
  };

  // Admin institutional aggregate data
  admin?: {
    departments: DepartmentInfo[];
    totalStudents: number;
    totalFaculty: number;
    totalClassrooms: number;
    totalSubjects: number;
    allAttendanceSummaries: StudentSubjectAttendance[];
    allMarks: StudentSubjectMarks[];
    allQueries: AcademicQuery[];
  };
}

export interface AiQuickAction {
  id: string;
  label: string;
  query: string;
  intent: AcademicAiIntent;
  icon: string;
  color: string;
}

export interface AiIntelligenceResponse {
  text: string;
  intent: AcademicAiIntent;
  suggestedFollowUps: string[];
  calculatedMetrics?: Record<string, any>;
  hasRealData: boolean;
}
