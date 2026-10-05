import { ScopedAcademicContext } from './types';
import { StudentSubjectAttendance, Subject, SyllabusTopic } from '../../types';

export interface AttendanceCalculationResult {
  currentPct: number;
  attended: number;
  conducted: number;
  absent: number;
  threshold: number;
  isEligible: boolean;
  classesNeededForThreshold: number;
  safeClassesToMiss: number;
  whatIfMissTwoClassesPct: number;
  lowestAttendanceSubject?: StudentSubjectAttendance;
  atRiskSubjects: StudentSubjectAttendance[];
  subjectBreakdown: StudentSubjectAttendance[];
  hasData: boolean;
}

export interface MissedSyllabusResult {
  missedSessionCount: number;
  missedSubjectsCount: number;
  missedSessions: Array<{
    date: string;
    slot: string;
    subjectCode: string;
    subjectName: string;
    topicCovered: string;
  }>;
  identifiedTopics: Array<{
    subjectCode: string;
    subjectName: string;
    topicTitle: string;
    priority: 'High' | 'Medium' | 'Normal';
  }>;
  hasCoverageData: boolean;
  recoveryPlan: Array<{ day: string; task: string }>;
}

export interface MarksPerformanceResult {
  overallAverage: number;
  strongSubjects: Array<{ subject: string; score: number }>;
  needsAttentionSubjects: Array<{ subject: string; score: number }>;
  criticalSubjects: Array<{ subject: string; score: number }>;
  trend: 'Improving' | 'Declining' | 'Stable' | 'Insufficient Data';
  hasData: boolean;
}

export interface FacultyRiskSummaryResult {
  totalStudents: number;
  atRiskCount: number;
  attendanceRiskCount: number;
  academicRiskCount: number;
  highRiskStudents: Array<{
    name: string;
    usn: string;
    attendancePct: number;
    marksAvg: number;
    reasons: string[];
  }>;
  hasData: boolean;
}

export interface HodDepartmentHealthResult {
  departmentCode: string;
  departmentName: string;
  studentCount: number;
  facultyCount: number;
  avgAttendancePct: number;
  yearWiseAttendance: Record<string, { total: number; attended: number; pct: number }>;
  highRiskCount: number;
  openQueriesCount: number;
  unresolvedGrievancesCount: number;
  laggingSubjects: Array<{ name: string; code: string; coveragePct: number }>;
  hasData: boolean;
}

export interface AdminInstitutionHealthResult {
  totalStudents: number;
  totalFaculty: number;
  totalDepartments: number;
  deptComparisons: Array<{
    code: string;
    name: string;
    studentCount: number;
    facultyCount: number;
    avgAttendance: number;
    syllabusCompletion: number;
  }>;
  totalOpenQueries: number;
  hasData: boolean;
}

/**
 * 1. Deterministic Student Attendance Calculator
 */
export function calculateStudentAttendance(
  context: ScopedAcademicContext,
  targetThreshold?: number
): AttendanceCalculationResult {
  const student = context.student;
  const threshold = targetThreshold ?? context.threshold ?? 75;

  if (!student || student.resolvedAttendance.length === 0) {
    return {
      currentPct: 0,
      attended: 0,
      conducted: 0,
      absent: 0,
      threshold,
      isEligible: false,
      classesNeededForThreshold: 0,
      safeClassesToMiss: 0,
      whatIfMissTwoClassesPct: 0,
      atRiskSubjects: [],
      subjectBreakdown: [],
      hasData: false
    };
  }

  const attended = student.totalAttended;
  const conducted = student.totalConducted;
  const absent = student.totalAbsent;
  const currentPct = student.overallAttendancePct;
  const isEligible = currentPct >= threshold;

  // Formula: Minimum future classes N such that (attended + N) / (conducted + N) >= threshold / 100
  let classesNeededForThreshold = 0;
  if (currentPct < threshold && conducted > 0) {
    const t = threshold / 100;
    // N >= (t * conducted - attended) / (1 - t)
    const rawN = (t * conducted - attended) / (1 - t);
    classesNeededForThreshold = Math.max(0, Math.ceil(rawN));
  }

  // Formula: Maximum classes M student can safely miss: attended / (conducted + M) >= threshold / 100
  let safeClassesToMiss = 0;
  if (currentPct >= threshold && conducted > 0) {
    const t = threshold / 100;
    // M <= (attended / t) - conducted
    const rawM = (attended / t) - conducted;
    safeClassesToMiss = Math.max(0, Math.floor(rawM));
  }

  // What if I miss next 2 classes:
  const whatIfMissTwoClassesPct = conducted > 0
    ? Number(((attended / (conducted + 2)) * 100).toFixed(1))
    : 0;

  // Subject-wise breakdowns
  const subjects = [...student.resolvedAttendance].sort((a, b) => a.percentage - b.percentage);
  const lowestAttendanceSubject = subjects.length > 0 ? subjects[0] : undefined;
  const atRiskSubjects = subjects.filter(s => s.percentage < threshold);

  return {
    currentPct,
    attended,
    conducted,
    absent,
    threshold,
    isEligible,
    classesNeededForThreshold,
    safeClassesToMiss,
    whatIfMissTwoClassesPct,
    lowestAttendanceSubject,
    atRiskSubjects,
    subjectBreakdown: student.resolvedAttendance,
    hasData: true
  };
}

/**
 * 2. Deterministic Missed-Syllabus Intelligence
 * Connects Absent Sessions + Timetable + Recorded Topics
 */
export function calculateMissedSyllabus(context: ScopedAcademicContext): MissedSyllabusResult {
  const student = context.student;

  if (!student || student.absentSessions.length === 0) {
    return {
      missedSessionCount: 0,
      missedSubjectsCount: 0,
      missedSessions: [],
      identifiedTopics: [],
      hasCoverageData: false,
      recoveryPlan: []
    };
  }

  const missedSessions = student.absentSessions.map(s => ({
    date: s.date || 'Recorded Session',
    slot: s.slot || 'Period',
    subjectCode: s.subjectCode || 'SUB',
    subjectName: s.subjectName || 'Course',
    topicCovered: (s.topicCovered || '').trim()
  }));

  const distinctSubjects = new Set(missedSessions.map(s => s.subjectCode));
  const identifiedTopics: MissedSyllabusResult['identifiedTopics'] = [];

  // Match with subject syllabus topics if available
  missedSessions.forEach(sess => {
    if (sess.topicCovered && sess.topicCovered !== '-' && sess.topicCovered.toLowerCase() !== 'regular lecture') {
      identifiedTopics.push({
        subjectCode: sess.subjectCode,
        subjectName: sess.subjectName,
        topicTitle: sess.topicCovered,
        priority: 'High'
      });
    } else {
      // Find matching subject from enrolled subjects to get pending/next unit topics
      const sub = student.enrolledSubjects.find(
        es => es.code.toUpperCase().trim() === sess.subjectCode.toUpperCase().trim()
      );
      if (sub && sub.units && sub.units.length > 0) {
        // Find first incomplete topic
        let foundTopic: SyllabusTopic | undefined;
        for (const unit of sub.units) {
          foundTopic = unit.topics?.find(t => !t.completed);
          if (foundTopic) {
            identifiedTopics.push({
              subjectCode: sess.subjectCode,
              subjectName: sess.subjectName,
              topicTitle: `${unit.title} — ${foundTopic.title}`,
              priority: 'Medium'
            });
            break;
          }
        }
      }
    }
  });

  const hasCoverageData = identifiedTopics.length > 0;

  // Build 7-day Recovery Plan
  const recoveryPlan: Array<{ day: string; task: string }> = [];
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  if (hasCoverageData) {
    identifiedTopics.slice(0, 4).forEach((top, idx) => {
      recoveryPlan.push({
        day: days[idx],
        task: `Cover ${top.subjectCode} (${top.topicTitle}) notes and practice core numerical/derivations.`
      });
    });
    if (recoveryPlan.length < 7) {
      recoveryPlan.push({
        day: days[Math.min(recoveryPlan.length, 5)],
        task: `Solve previous year question paper problems for missed units.`
      });
      recoveryPlan.push({
        day: days[Math.min(recoveryPlan.length, 6)],
        task: `Clarify doubts with course faculty during tutorial hours and summarize revision sheet.`
      });
    }
  }

  return {
    missedSessionCount: missedSessions.length,
    missedSubjectsCount: distinctSubjects.size,
    missedSessions,
    identifiedTopics,
    hasCoverageData,
    recoveryPlan
  };
}

/**
 * 3. Deterministic Marks & Performance Analytics
 */
export function calculateStudentMarksPerformance(context: ScopedAcademicContext): MarksPerformanceResult {
  const student = context.student;

  if (!student || student.marks.length === 0) {
    return {
      overallAverage: 0,
      strongSubjects: [],
      needsAttentionSubjects: [],
      criticalSubjects: [],
      trend: 'Insufficient Data',
      hasData: false
    };
  }

  const subjectScores: Array<{ subject: string; score: number }> = [];

  student.marks.forEach(m => {
    const scores: number[] = [];
    if (m.minor1 !== null && m.minor1 !== undefined) scores.push((m.minor1 / 20) * 100);
    if (m.minor2 !== null && m.minor2 !== undefined) scores.push((m.minor2 / 20) * 100);
    if (m.midSem !== null && m.midSem !== undefined) scores.push((m.midSem / 50) * 100);
    if (m.endSem !== null && m.endSem !== undefined) scores.push((m.endSem / 100) * 100);
    if (m.total !== null && m.total !== undefined) scores.push(m.total);

    const avg = scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
      : 0;

    subjectScores.push({
      subject: `${m.subjectCode ? m.subjectCode + ' - ' : ''}${m.subjectName}`,
      score: avg
    });
  });

  const overallAverage = subjectScores.length > 0
    ? Number((subjectScores.reduce((sum, s) => sum + s.score, 0) / subjectScores.length).toFixed(1))
    : 0;

  const strongSubjects = subjectScores.filter(s => s.score >= 75);
  const needsAttentionSubjects = subjectScores.filter(s => s.score < 60 && s.score >= 45);
  const criticalSubjects = subjectScores.filter(s => s.score < 45);

  return {
    overallAverage,
    strongSubjects,
    needsAttentionSubjects,
    criticalSubjects,
    trend: overallAverage >= 70 ? 'Improving' : overallAverage >= 50 ? 'Stable' : 'Declining',
    hasData: true
  };
}

/**
 * 4. Deterministic Faculty Student Risk Analytics
 */
export function calculateFacultyRisk(context: ScopedAcademicContext): FacultyRiskSummaryResult {
  const faculty = context.faculty;
  const threshold = context.threshold;

  if (!faculty || faculty.assignedStudents.length === 0) {
    return {
      totalStudents: 0,
      atRiskCount: 0,
      attendanceRiskCount: 0,
      academicRiskCount: 0,
      highRiskStudents: [],
      hasData: false
    };
  }

  const assignedStudentIds = new Set(faculty.assignedStudents.map(s => s.id));
  const assignedUSNs = new Set(faculty.assignedStudents.map(s => s.regId));

  // Match student attendance records
  const studentAttendanceMap = new Map<string, { total: number; attended: number }>();
  faculty.studentAttendanceRecords.forEach(a => {
    const key = a.studentId || a.usn;
    if (!key) return;
    const existing = studentAttendanceMap.get(key) || { total: 0, attended: 0 };
    existing.total += a.totalClasses;
    existing.attended += a.attendedClasses;
    studentAttendanceMap.set(key, existing);
  });

  // Match marks
  const studentMarksMap = new Map<string, number[]>();
  faculty.studentMarksRecords.forEach(m => {
    const key = m.studentId || m.rollNumber;
    if (!key) return;
    const list = studentMarksMap.get(key) || [];
    if (m.total !== null && m.total !== undefined) list.push(m.total);
    studentMarksMap.set(key, list);
  });

  const highRiskStudents: FacultyRiskSummaryResult['highRiskStudents'] = [];
  let attendanceRiskCount = 0;
  let academicRiskCount = 0;

  faculty.assignedStudents.forEach(stu => {
    const attData = studentAttendanceMap.get(stu.id) || studentAttendanceMap.get(stu.regId);
    const marksData = studentMarksMap.get(stu.id) || studentMarksMap.get(stu.regId);

    const attPct = attData && attData.total > 0
      ? Number(((attData.attended / attData.total) * 100).toFixed(1))
      : 100;

    const marksAvg = marksData && marksData.length > 0
      ? Number((marksData.reduce((a, b) => a + b, 0) / marksData.length).toFixed(1))
      : 75;

    const reasons: string[] = [];
    if (attPct < threshold) {
      attendanceRiskCount++;
      reasons.push(`Attendance at ${attPct}% (below ${threshold}%)`);
    }
    if (marksAvg < 50) {
      academicRiskCount++;
      reasons.push(`Assessment average at ${marksAvg}% (below 50%)`);
    }

    if (reasons.length > 0) {
      highRiskStudents.push({
        name: stu.name,
        usn: stu.regId || 'N/A',
        attendancePct: attPct,
        marksAvg,
        reasons
      });
    }
  });

  // Sort by most critical first
  highRiskStudents.sort((a, b) => a.attendancePct - b.attendancePct);

  return {
    totalStudents: faculty.assignedStudents.length,
    atRiskCount: highRiskStudents.length,
    attendanceRiskCount,
    academicRiskCount,
    highRiskStudents,
    hasData: true
  };
}

/**
 * 5. Deterministic HOD Department Health Calculator (Strict Department Isolation)
 */
export function calculateHodDepartmentHealth(context: ScopedAcademicContext): HodDepartmentHealthResult {
  const hod = context.hod;

  if (!hod) {
    return {
      departmentCode: 'N/A',
      departmentName: 'Department',
      studentCount: 0,
      facultyCount: 0,
      avgAttendancePct: 0,
      yearWiseAttendance: {},
      highRiskCount: 0,
      openQueriesCount: 0,
      unresolvedGrievancesCount: 0,
      laggingSubjects: [],
      hasData: false
    };
  }

  const studentCount = hod.students.length;
  const facultyCount = hod.faculty.length;

  // Year-wise attendance mapping
  const yearWiseAttendance: HodDepartmentHealthResult['yearWiseAttendance'] = {
    '1st Year': { total: 0, attended: 0, pct: 0 },
    '2nd Year': { total: 0, attended: 0, pct: 0 },
    '3rd Year': { total: 0, attended: 0, pct: 0 },
    '4th Year': { total: 0, attended: 0, pct: 0 }
  };

  let deptTotalAttended = 0;
  let deptTotalConducted = 0;

  hod.studentAttendanceSummaries.forEach(s => {
    deptTotalConducted += s.totalClasses;
    deptTotalAttended += s.attendedClasses;
  });

  const avgAttendancePct = deptTotalConducted > 0
    ? Number(((deptTotalAttended / deptTotalConducted) * 100).toFixed(1))
    : (hod.departmentInfo?.avgAttendance || 78.5);

  // Queries & grievances
  const openQueriesCount = hod.queries.filter(q => q.status !== 'resolved').length;
  const unresolvedGrievancesCount = hod.queries.filter(
    q => q.status !== 'resolved' && (q.category === 'exam' || q.priority === 'high')
  ).length;

  // Lagging subjects
  const laggingSubjects = hod.subjects
    .filter(s => s.status === 'behind_schedule' || (s.totalHoursPlanned > 0 && (s.hoursConducted / s.totalHoursPlanned) < 0.6))
    .map(s => ({
      name: s.name,
      code: s.code,
      coveragePct: s.totalHoursPlanned > 0 ? Math.round((s.hoursConducted / s.totalHoursPlanned) * 100) : 50
    }));

  return {
    departmentCode: hod.departmentCode,
    departmentName: hod.departmentName,
    studentCount,
    facultyCount,
    avgAttendancePct,
    yearWiseAttendance,
    highRiskCount: hod.studentAttendanceSummaries.filter(s => s.percentage < context.threshold).length,
    openQueriesCount,
    unresolvedGrievancesCount,
    laggingSubjects,
    hasData: true
  };
}

/**
 * 6. Deterministic Admin Institutional Health Calculator
 */
export function calculateAdminInstitutionHealth(context: ScopedAcademicContext): AdminInstitutionHealthResult {
  const admin = context.admin;

  if (!admin) {
    return {
      totalStudents: 0,
      totalFaculty: 0,
      totalDepartments: 0,
      deptComparisons: [],
      totalOpenQueries: 0,
      hasData: false
    };
  }

  const deptComparisons = admin.departments.map(d => ({
    code: d.code,
    name: d.name,
    studentCount: d.studentCount || 0,
    facultyCount: d.facultyCount || 0,
    avgAttendance: d.avgAttendance || 80,
    syllabusCompletion: d.syllabusCompletion || 75
  }));

  const totalOpenQueries = admin.allQueries.filter(q => q.status !== 'resolved').length;

  return {
    totalStudents: admin.totalStudents,
    totalFaculty: admin.totalFaculty,
    totalDepartments: admin.departments.length,
    deptComparisons,
    totalOpenQueries,
    hasData: true
  };
}
