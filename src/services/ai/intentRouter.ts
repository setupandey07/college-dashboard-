import { UserRole } from '../../types';
import { AcademicAiIntent } from './types';

const PROHIBITED_REGEX = /\b(porn|pornography|erotic|sex|sexy|sexual|nude|nudity|nsfw|xxx|strip|fetish|orgasm|incest|rape|pedophile|masturbat|horny|kill\s+yourself|suicide\s+method|hate\s+speech|slur|f\*\*k|bitch|bastard|asshole)\b/i;

/**
 * Robust Intent Detection & Routing based on user role and query semantics
 */
export function detectAcademicIntent(query: string, role: UserRole): AcademicAiIntent {
  if (PROHIBITED_REGEX.test(query)) {
    return 'safety_violation';
  }

  const lower = query.toLowerCase().trim();

  // ==========================================
  // 1. STUDENT INTENTS
  // ==========================================
  if (role === 'student') {
    // Attendance recovery / calculation questions
    if (
      lower.includes('reach 75') ||
      lower.includes('recover') ||
      lower.includes('how many more') ||
      lower.includes('how many classes do i need') ||
      lower.includes('miss the next') ||
      lower.includes('miss 2') ||
      lower.includes('safely miss') ||
      lower.includes('kitne din') ||
      lower.includes('kitni class') ||
      lower.includes('consecutive classes')
    ) {
      return 'student_attendance_recovery';
    }

    // General attendance queries
    if (
      lower.includes('attendance') ||
      lower.includes('absent') ||
      lower.includes('attended') ||
      lower.includes('present') ||
      lower.includes('shortage') ||
      lower.includes('lowest attendance') ||
      lower.includes('at risk')
    ) {
      return 'student_attendance';
    }

    // Missed syllabus intelligence
    if (
      lower.includes('missed syllabus') ||
      lower.includes('what syllabus did i miss') ||
      lower.includes('classes i missed') ||
      lower.includes('topics missed') ||
      lower.includes('covered during my absence') ||
      lower.includes('cover what i missed') ||
      lower.includes('classes missed')
    ) {
      return 'student_missed_syllabus';
    }

    // Marks and academic performance
    if (
      lower.includes('marks') ||
      lower.includes('score') ||
      lower.includes('performance') ||
      lower.includes('cgpa') ||
      lower.includes('grade') ||
      lower.includes('minor') ||
      lower.includes('mid sem') ||
      lower.includes('end sem') ||
      lower.includes('weak subject') ||
      lower.includes('marks dropped')
    ) {
      return 'student_marks';
    }

    // Study planning / 7-day recovery
    if (
      lower.includes('study plan') ||
      lower.includes('recovery plan') ||
      lower.includes('7-day') ||
      lower.includes('5 days before') ||
      lower.includes('exam preparation') ||
      lower.includes('exam prep') ||
      lower.includes('timetable for study') ||
      lower.includes('prepare for exam')
    ) {
      return 'student_study_plan';
    }

    // Focus areas / priority
    if (
      lower.includes('focus on') ||
      lower.includes('what should i study first') ||
      lower.includes('priority') ||
      lower.includes('immediate attention')
    ) {
      return 'student_focus_areas';
    }
  }

  // ==========================================
  // 2. FACULTY INTENTS
  // ==========================================
  if (role === 'faculty') {
    if (
      lower.includes('student risk') ||
      lower.includes('at risk') ||
      lower.includes('who is failing') ||
      lower.includes('repeated absence') ||
      lower.includes('attendance issue')
    ) {
      return 'faculty_student_risk';
    }

    if (
      lower.includes('mentee') ||
      lower.includes('mentor summary') ||
      lower.includes('mentees')
    ) {
      return 'faculty_mentees';
    }

    if (
      lower.includes('class performance') ||
      lower.includes('subject performance') ||
      lower.includes('how is my assigned class')
    ) {
      return 'faculty_class_performance';
    }

    if (
      lower.includes('syllabus covered') ||
      lower.includes('syllabus coverage') ||
      lower.includes('pacing')
    ) {
      return 'faculty_syllabus_coverage';
    }
  }

  // ==========================================
  // 3. HOD INTENTS
  // ==========================================
  if (role === 'hod') {
    if (
      lower.includes('department summary') ||
      lower.includes('department health') ||
      lower.includes('how is my department') ||
      lower.includes('overview')
    ) {
      return 'hod_department_summary';
    }

    if (
      lower.includes('students at risk') ||
      lower.includes('attendance risk') ||
      lower.includes('academic risk') ||
      lower.includes('year attendance problem') ||
      lower.includes('which year has')
    ) {
      return 'hod_students_at_risk';
    }

    if (
      lower.includes('query') ||
      lower.includes('queries') ||
      lower.includes('grievance') ||
      lower.includes('grievances') ||
      lower.includes('student concern')
    ) {
      return 'hod_queries_grievances';
    }

    if (lower.includes('mentor insight') || lower.includes('mentor program')) {
      return 'hod_mentor_insights';
    }
  }

  // ==========================================
  // 4. ADMIN INTENTS
  // ==========================================
  if (role === 'admin') {
    if (
      lower.includes('institution summary') ||
      lower.includes('institutional summary') ||
      lower.includes('all departments') ||
      lower.includes('college health')
    ) {
      return 'admin_institution_summary';
    }

    if (
      lower.includes('department comparison') ||
      lower.includes('compare department') ||
      lower.includes('which department needs attention')
    ) {
      return 'admin_department_comparison';
    }

    if (lower.includes('attendance trend')) {
      return 'admin_attendance_trends';
    }

    if (lower.includes('academic trend')) {
      return 'admin_academic_trends';
    }

    if (lower.includes('mentor program')) {
      return 'admin_mentor_program';
    }

    if (lower.includes('student concern') || lower.includes('grievance')) {
      return 'admin_student_concerns';
    }
  }

  // ==========================================
  // 5. CROSS-ROLE ACADEMIC & ENGINEERING INTENTS
  // ==========================================
  if (
    /^(explain|teach\s+me|what\s+is|what\s+are|how\s+does|how\s+do|principle\s+of|working\s+of|concept\s+of|derivation\s+of)/.test(lower) ||
    lower.includes('explain') ||
    lower.includes('teach me') ||
    lower.includes('working principle')
  ) {
    return 'concept';
  }

  if (
    /\b(numerical|calculate|solve|formula\s+for|substitution|calculation|find\s+the\s+value)\b/.test(lower) ||
    /(\d+\s*[\+\-\*\/]\s*\d+)/.test(lower)
  ) {
    return 'numerical';
  }

  if (
    /\b(code|program|python|c\+\+|java|javascript|algorithm|function|debug|pointer|recursion)\b/.test(lower)
  ) {
    return 'coding';
  }

  if (
    /\b(career|placement|internship|resume|interview|gate|higher\s+studies|job|salary)\b/.test(lower)
  ) {
    return 'career';
  }

  return 'general';
}
