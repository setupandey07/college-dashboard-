import { AttendanceSession, StudentSubjectAttendance } from '../types';

export interface AttendanceAggregate {
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  percentage: number;
  isEligible: boolean;
  subjects: StudentSubjectAttendance[];
}

/**
 * Resolves a student's authoritative subject-wise attendance by merging:
 * 1. Live attendanceSessions (provides instantaneous 0ms updates and covers newly marked sessions)
 * 2. Firestore studentAttendance summaries (provides persistent database records)
 *
 * Guarantees:
 * - 100% deduplication by subject code (prevents duplicate subject rows and doubled numbers)
 * - Strict real user isolation (matches by either studentId or registration USN)
 * - Accurate recalculation of total, attended, absent, percentage, and regulatory standing
 */
export function resolveStudentAttendance(
  targetStudentId?: string,
  targetRegId?: string,
  attendanceSessions: AttendanceSession[] = [],
  studentAttendanceSummaries: StudentSubjectAttendance[] = []
): StudentSubjectAttendance[] {
  const tid = (targetStudentId || '').trim().toLowerCase();
  const treg = (targetRegId || '').trim().toLowerCase();

  if (!tid && !treg) return [];

  // 1. Filter summaries belonging to this student
  const matchedSummaries = studentAttendanceSummaries.filter(a => {
    if (!a.studentId && !a.usn) return false;
    const sid = (a.studentId || '').trim().toLowerCase();
    const susn = (a.usn || '').trim().toLowerCase();
    return (
      (tid && (sid === tid || susn === tid)) ||
      (treg && (sid === treg || susn === treg))
    );
  });

  // Map summaries by uppercase subject code
  const summaryBySub = new Map<string, StudentSubjectAttendance>();
  for (const s of matchedSummaries) {
    const key = (s.subjectCode || s.subjectId).trim().toUpperCase();
    if (!key) continue;
    const existing = summaryBySub.get(key);
    // Keep the record with higher totalClasses if duplicates exist
    if (!existing || s.totalClasses > existing.totalClasses) {
      summaryBySub.set(key, s);
    }
  }

  // 2. Derive attendance dynamically from all live/optimistic attendanceSessions
  const sessionsForStudent = attendanceSessions.filter(sess =>
    sess.records?.some(r => {
      const rid = (r.studentId || '').trim().toLowerCase();
      const rusn = (r.usn || '').trim().toLowerCase();
      return (tid && (rid === tid || rusn === tid)) || (treg && (rid === treg || rusn === treg));
    })
  );

  const sessionsBySub = new Map<string, AttendanceSession[]>();
  for (const sess of sessionsForStudent) {
    const key = (sess.subjectCode || sess.subjectId).trim().toUpperCase();
    if (!key) continue;
    const list = sessionsBySub.get(key) || [];
    list.push(sess);
    sessionsBySub.set(key, list);
  }

  const derivedBySub = new Map<string, StudentSubjectAttendance>();
  sessionsBySub.forEach((sessions, subKey) => {
    const first = sessions[0];
    const total = sessions.length;
    let attended = 0;
    const presentDates: string[] = [];

    for (const sess of sessions) {
      const rec = sess.records?.find(r => {
        const rid = (r.studentId || '').trim().toLowerCase();
        const rusn = (r.usn || '').trim().toLowerCase();
        return (tid && (rid === tid || rusn === tid)) || (treg && (rid === treg || rusn === treg));
      });
      if (rec?.status === 'present') {
        attended++;
        if (sess.date) presentDates.push(sess.date);
      }
    }

    const absent = Math.max(0, total - attended);
    const percentage = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0;
    const status: 'safe' | 'warning' | 'critical' =
      percentage >= 75 ? 'safe' : percentage >= 65 ? 'warning' : 'critical';

    presentDates.sort().reverse();
    const lastAttended = presentDates[0] || '';

    const studentRecord = first.records?.find(r => {
      const rid = (r.studentId || '').trim().toLowerCase();
      const rusn = (r.usn || '').trim().toLowerCase();
      return (tid && (rid === tid || rusn === tid)) || (treg && (rid === treg || rusn === treg));
    });

    derivedBySub.set(subKey, {
      id: `${targetStudentId || targetRegId}_${first.subjectCode}`,
      studentId: targetStudentId || '',
      usn: targetRegId || '',
      studentName: studentRecord?.studentName || '',
      subjectId: first.subjectId,
      subjectCode: first.subjectCode,
      subjectName: first.subjectName,
      facultyName: first.facultyName || 'Course Faculty',
      totalClasses: total,
      attendedClasses: attended,
      absentClasses: absent,
      percentage,
      lastAttended,
      status
    });
  });

  // 3. Merge: Combine derived and summary, picking the most authoritative data per subject
  const allSubKeys = new Set([...summaryBySub.keys(), ...derivedBySub.keys()]);
  const finalAttendance: StudentSubjectAttendance[] = [];

  allSubKeys.forEach(subKey => {
    const summary = summaryBySub.get(subKey);
    const derived = derivedBySub.get(subKey);

    if (derived && summary) {
      // If derived has equal or more sessions, use derived to reflect fresh/optimistic sessions
      // Otherwise retain summary if summary has more total classes (e.g. historical data)
      if (derived.totalClasses >= summary.totalClasses) {
        finalAttendance.push({
          ...summary,
          ...derived,
          facultyName: derived.facultyName || summary.facultyName
        });
      } else {
        finalAttendance.push(summary);
      }
    } else if (derived) {
      finalAttendance.push(derived);
    } else if (summary) {
      finalAttendance.push(summary);
    }
  });

  // Sort by subject code
  finalAttendance.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));

  return finalAttendance;
}

/**
 * Computes aggregate attendance metrics across all subjects
 */
export function computeAttendanceAggregate(
  subjects: StudentSubjectAttendance[]
): AttendanceAggregate {
  const totalClasses = subjects.reduce((sum, s) => sum + s.totalClasses, 0);
  const attendedClasses = subjects.reduce((sum, s) => sum + s.attendedClasses, 0);
  const absentClasses = Math.max(0, totalClasses - attendedClasses);
  const percentage = totalClasses > 0
    ? Number(((attendedClasses / totalClasses) * 100).toFixed(1))
    : 0;

  return {
    totalClasses,
    attendedClasses,
    absentClasses,
    percentage,
    isEligible: totalClasses === 0 || percentage >= 75,
    subjects
  };
}
