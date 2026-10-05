import {
  UserProfile,
  UserRole,
  StudentSubjectAttendance,
  StudentSubjectMarks,
  AttendanceSession,
  Subject,
  DepartmentInfo,
  AcademicQuery
} from '../../types';
import { AcademicSection } from '../firestore';
import { ClassTimetable } from '../firestore/timetables';
import { resolveStudentAttendance, computeAttendanceAggregate } from '../../lib/attendanceCalculations';
import { ScopedAcademicContext } from './types';

export const INSTITUTIONAL_ATTENDANCE_THRESHOLD = 75; // Configurable statutory threshold

/**
 * Resolves the authorized, strictly-scoped academic data context for the active user.
 * ZERO unauthorized database leakage.
 */
export function resolveUserScope(
  currentUser: UserProfile,
  currentRole: UserRole,
  data: {
    departments: DepartmentInfo[];
    sections: AcademicSection[];
    subjects: Subject[];
    attendanceSessions: AttendanceSession[];
    studentAttendance: StudentSubjectAttendance[];
    studentMarks: StudentSubjectMarks[];
    queries: AcademicQuery[];
    users: UserProfile[];
    timetables: ClassTimetable[];
  }
): ScopedAcademicContext {
  const {
    departments,
    sections,
    subjects,
    attendanceSessions,
    studentAttendance,
    studentMarks,
    queries,
    users,
    timetables
  } = data;

  const threshold = INSTITUTIONAL_ATTENDANCE_THRESHOLD;
  const baseContext: ScopedAcademicContext = {
    role: currentRole,
    user: currentUser,
    threshold
  };

  // ==========================================
  // 1. STUDENT SCOPE
  // ==========================================
  if (currentRole === 'student') {
    const studentId = currentUser.id;
    const usn = currentUser.regId;

    // Resolve authoritative personal attendance
    const resolvedAttendance = resolveStudentAttendance(
      studentId,
      usn,
      attendanceSessions,
      studentAttendance
    );
    const agg = computeAttendanceAggregate(resolvedAttendance);

    // Personal marks
    const myMarks = studentMarks.filter(m => {
      const matchSid = m.studentId && (m.studentId === studentId || m.studentId === usn);
      const matchRoll = m.rollNumber && (m.rollNumber === usn || m.rollNumber === studentId);
      return matchSid || matchRoll;
    });

    // Personal classroom
    const stuDeptCode = (currentUser.departmentCode || '').toUpperCase().trim();
    const stuDeptName = (currentUser.department || '').toLowerCase().trim();
    const stuYearNum = currentUser.currentAcademicYear
      ? parseInt(currentUser.currentAcademicYear.charAt(0))
      : (currentUser.semester ? Math.ceil(currentUser.semester / 2) : 1);
    const stuSec = (currentUser.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();

    const myClassroom = sections.find(sec => {
      if (sec.status === 'inactive') return false;
      const sDept = (sec.departmentCode || '').toUpperCase().trim();
      const sName = (sec.departmentName || '').toLowerCase().trim();
      const matchDept = (stuDeptCode && sDept === stuDeptCode) || (stuDeptName && sName === stuDeptName);
      const matchYear = sec.yearNumber === stuYearNum;
      const matchSec = (sec.sectionName || '').replace(/^Section\s+/i, '').trim().toUpperCase() === stuSec;
      return matchDept && matchYear && matchSec;
    });

    // Classroom timetable
    const myTimetable = myClassroom
      ? timetables.find(t => t.sectionId === myClassroom.id || t.id === myClassroom.id || t.id === `tt-${myClassroom.id}`)
      : undefined;

    // Enrolled subjects for this student's classroom
    const enrolledSubjects = subjects.filter(s => {
      if (s.status === 'completed') return false;
      const subDeptCode = (s.departmentCode || '').toUpperCase().trim();
      const subDeptName = (s.department || '').toLowerCase().trim();
      const matchDept = (stuDeptCode && subDeptCode === stuDeptCode) || (stuDeptName && subDeptName === stuDeptName);
      const subYear = s.year || (s.semester ? Math.ceil(s.semester / 2) : 0);
      const matchYear = subYear === stuYearNum;
      const subSec = (s.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
      const matchSec = !subSec || subSec === stuSec;
      return matchDept && matchYear && matchSec;
    });

    // Absent attendance sessions
    const absentSessions = attendanceSessions.filter(sess => {
      return sess.records?.some(r => {
        const rid = (r.studentId || '').trim().toLowerCase();
        const rusn = (r.usn || '').trim().toLowerCase();
        const isMe = (studentId && (rid === studentId.toLowerCase() || rusn === studentId.toLowerCase())) ||
                     (usn && (rid === usn.toLowerCase() || rusn === usn.toLowerCase()));
        return isMe && r.status === 'absent';
      });
    });

    // Student's own queries
    const myQueries = queries.filter(q => q.createdByUserId === studentId || q.studentId === studentId || q.usn === usn);

    baseContext.student = {
      resolvedAttendance,
      overallAttendancePct: agg.percentage,
      totalConducted: agg.totalClasses,
      totalAttended: agg.attendedClasses,
      totalAbsent: agg.absentClasses,
      isEligible: agg.isEligible,
      marks: myMarks,
      classroom: myClassroom,
      timetable: myTimetable,
      enrolledSubjects,
      absentSessions,
      queries: myQueries
    };

    return baseContext;
  }

  // ==========================================
  // 2. FACULTY SCOPE
  // ==========================================
  if (currentRole === 'faculty') {
    const facultyId = currentUser.id;
    const assignedIds = new Set<string>();
    if (Array.isArray(currentUser.assignedSubjectIds)) {
      currentUser.assignedSubjectIds.forEach(id => assignedIds.add(id));
    }
    if (currentUser.assignedSubjectId) {
      assignedIds.add(currentUser.assignedSubjectId);
    }

    // Subjects taught by this faculty
    const assignedSubjects = subjects.filter(
      s => assignedIds.has(s.id) || assignedIds.has(s.code) || s.facultyId === facultyId
    );
    const assignedSubCodes = new Set(assignedSubjects.map(s => s.code.toUpperCase().trim()));

    // Classrooms where faculty teaches or is class teacher
    const assignedClassrooms = sections.filter(sec => {
      if (sec.classTeacherId === facultyId) return true;
      return assignedSubjects.some(sub => {
        if (sub.classId && sub.classId === sec.id) return true;
        const normSubSec = (sub.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
        const normSec = (sec.sectionName || '').replace(/^Section\s+/i, '').trim().toUpperCase();
        const subYear = sub.year || (sub.semester ? Math.ceil(sub.semester / 2) : 0);
        return subYear === sec.yearNumber && normSubSec === normSec;
      });
    });

    // Students enrolled in faculty's classrooms
    const classIds = new Set(assignedClassrooms.map(c => c.id));
    const assignedStudents = users.filter(u => {
      if (u.role !== 'student') return false;
      const uDept = (u.departmentCode || '').toUpperCase().trim();
      const uYear = u.currentAcademicYear ? parseInt(u.currentAcademicYear.charAt(0)) : 0;
      const uSec = (u.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();

      return assignedClassrooms.some(c => {
        const cDept = (c.departmentCode || '').toUpperCase().trim();
        const cSec = (c.sectionName || '').replace(/^Section\s+/i, '').trim().toUpperCase();
        return cDept === uDept && c.yearNumber === uYear && cSec === uSec;
      });
    });

    // Mentees assigned to this faculty
    const mentees = users.filter(u => (u as any).mentorId === facultyId || (u as any).facultyAdvisorId === facultyId);

    // Attendance sessions conducted by this faculty
    const conductedSessions = attendanceSessions.filter(
      sess => sess.facultyId === facultyId || assignedSubCodes.has(sess.subjectCode.toUpperCase().trim())
    );

    // Filter student attendance summaries for faculty's subjects
    const studentAttendanceRecords = studentAttendance.filter(a =>
      assignedSubCodes.has(a.subjectCode.toUpperCase().trim())
    );

    // Student marks for faculty's subjects
    const studentMarksRecords = studentMarks.filter(m =>
      assignedSubCodes.has(m.subjectCode.toUpperCase().trim())
    );

    // Queries directed to or created by this faculty
    const facultyQueries = queries.filter(
      q => q.recipientUserId === facultyId || q.assignedTo === facultyId || q.createdByUserId === facultyId
    );

    baseContext.faculty = {
      assignedSubjects,
      assignedClassrooms,
      assignedStudents,
      mentees,
      conductedSessions,
      studentAttendanceRecords,
      studentMarksRecords,
      queries: facultyQueries
    };

    return baseContext;
  }

  // ==========================================
  // 3. HOD SCOPE (Strict Department Isolation)
  // ==========================================
  if (currentRole === 'hod') {
    const hodDeptCode = (currentUser.departmentCode || '').toUpperCase().trim();
    const hodDeptName = (currentUser.department || '').toLowerCase().trim();

    const deptInfo = departments.find(
      d => d.code.toUpperCase() === hodDeptCode || d.name.toLowerCase() === hodDeptName
    );

    // Department students ONLY
    const deptStudents = users.filter(u => {
      if (u.role !== 'student') return false;
      const uDeptCode = (u.departmentCode || '').toUpperCase().trim();
      const uDeptName = (u.department || '').toLowerCase().trim();
      return (hodDeptCode && uDeptCode === hodDeptCode) || (hodDeptName && uDeptName === hodDeptName);
    });

    // Department faculty ONLY
    const deptFaculty = users.filter(u => {
      if (u.role !== 'faculty' && u.role !== 'lab_assistant') return false;
      const uDeptCode = (u.departmentCode || '').toUpperCase().trim();
      const uDeptName = (u.department || '').toLowerCase().trim();
      return (hodDeptCode && uDeptCode === hodDeptCode) || (hodDeptName && uDeptName === hodDeptName);
    });

    // Department classrooms ONLY
    const deptClassrooms = sections.filter(sec => {
      const sDeptCode = (sec.departmentCode || '').toUpperCase().trim();
      const sDeptName = (sec.departmentName || '').toLowerCase().trim();
      return (hodDeptCode && sDeptCode === hodDeptCode) || (hodDeptName && sDeptName === hodDeptName);
    });

    // Department subjects ONLY
    const deptSubjects = subjects.filter(s => {
      const sDeptCode = (s.departmentCode || '').toUpperCase().trim();
      const sDeptName = (s.department || '').toLowerCase().trim();
      return (hodDeptCode && sDeptCode === hodDeptCode) || (hodDeptName && sDeptName === hodDeptName);
    });
    const deptSubCodes = new Set(deptSubjects.map(s => s.code.toUpperCase().trim()));

    // Department sessions ONLY
    const deptSessions = attendanceSessions.filter(sess => {
      const sDeptCode = (sess.departmentCode || '').toUpperCase().trim();
      const sDeptName = (sess.department || '').toLowerCase().trim();
      return (
        (hodDeptCode && sDeptCode === hodDeptCode) ||
        (hodDeptName && sDeptName === hodDeptName) ||
        deptSubCodes.has(sess.subjectCode.toUpperCase().trim())
      );
    });

    // Department attendance summaries ONLY
    const deptAttendance = studentAttendance.filter(a =>
      deptSubCodes.has(a.subjectCode.toUpperCase().trim())
    );

    // Department marks ONLY
    const deptMarks = studentMarks.filter(m =>
      deptSubCodes.has(m.subjectCode.toUpperCase().trim())
    );

    // Department queries ONLY
    const deptQueries = queries.filter(q => {
      const qDept = (q.department || q.recipientDepartment || q.senderDepartment || '').toUpperCase().trim();
      return qDept === hodDeptCode || q.departmentId === deptInfo?.id;
    });

    baseContext.hod = {
      departmentCode: hodDeptCode,
      departmentName: deptInfo?.name || currentUser.department,
      departmentInfo: deptInfo,
      students: deptStudents,
      faculty: deptFaculty,
      classrooms: deptClassrooms,
      subjects: deptSubjects,
      sessions: deptSessions,
      studentAttendanceSummaries: deptAttendance,
      marks: deptMarks,
      queries: deptQueries
    };

    return baseContext;
  }

  // ==========================================
  // 4. ADMIN SCOPE (Institutional Aggregates)
  // ==========================================
  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalFaculty = users.filter(u => u.role === 'faculty').length;

  baseContext.admin = {
    departments,
    totalStudents,
    totalFaculty,
    totalClassrooms: sections.length,
    totalSubjects: subjects.length,
    allAttendanceSummaries: studentAttendance,
    allMarks: studentMarks,
    allQueries: queries
  };

  return baseContext;
}
