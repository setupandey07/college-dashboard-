import { AcademicQuery, UserProfile, UserRole } from '../types';

/**
 * Strict Data Isolation & Query Visibility Policy
 *
 * Visibility Rules:
 * 1. Sender (Student, Faculty, Staff) -> Always sees queries they created (createdBy / studentId / senderEmail).
 * 2. Unrelated Students -> NEVER see another student's queries under any circumstances.
 * 3. Specific Recipient -> A user who is explicitly targeted (recipientId === user.id) sees it.
 * 4. Department HOD -> An HOD sees queries specifically addressed to the HOD / departmental escalation
 *    of THEIR department only (e.g. HOD of EEE sees EEE HOD queries; CSE HOD cannot see EEE queries).
 * 5. Department Faculty -> Faculty members only see queries addressed to them directly (recipientId),
 *    or addressed to faculty of their specific department.
 * 6. Lab Assistants -> Only see lab equipment / laboratory category inquiries in their scope.
 * 7. Administrator -> Full institutional oversight for system governance and SLA compliance.
 */
export function canUserAccessQuery(
  q: AcademicQuery,
  user: UserProfile | null,
  role: UserRole | null
): boolean {
  if (!user || !role) return false;

  // 1. Admin superuser institutional governance & audit
  if (role === 'admin') {
    return true;
  }

  const userId = user.id;
  const userEmail = (user.email || '').trim().toLowerCase();
  const userDeptCode = (user.departmentCode || '').trim().toUpperCase();
  const userDeptName = (user.department || '').trim().toLowerCase();
  const userRegId = (user.regId || '').trim().toUpperCase();

  // 2. Creator / Sender check: The person who raised the query ALWAYS sees it
  const isSender = Boolean(
    (q.createdByUserId && q.createdByUserId === userId) ||
    (q.createdBy && q.createdBy === userId) ||
    (q.studentId && q.studentId === userId) ||
    (q.senderEmail && userEmail && q.senderEmail.trim().toLowerCase() === userEmail) ||
    (userRegId && q.usn && q.usn.trim().toUpperCase() === userRegId)
  );

  if (isSender) {
    return true;
  }

  // CRITICAL PRIVACY RULE: If user is a student and NOT the sender, they can NEVER see it!
  // "Student C cannot see it. Other students cannot see it."
  if (role === 'student') {
    return false;
  }

  // 3. Direct Individual Recipient check: Target recipient always sees it
  const targetRecipientId = q.recipientUserId || q.recipientId;
  const isDirectRecipient = Boolean(
    targetRecipientId && targetRecipientId === userId
  );

  if (isDirectRecipient) {
    return true;
  }

  // If the query was explicitly addressed to another individual recipient, NO OTHER FACULTY can see it!
  // "Student A sends query to Faculty B -> Faculty C cannot see it. Other faculty cannot see it."
  if (targetRecipientId && targetRecipientId !== userId) {
    // Only HOD has departmental oversight over queries in their own department
    if (role === 'hod') {
      const qTargetDept = (q.departmentId || q.recipientDepartment || q.department || '').trim().toUpperCase();
      const isMatchingDept = Boolean(
        userDeptCode &&
        qTargetDept &&
        (qTargetDept === userDeptCode || (userDeptName && qTargetDept.toLowerCase() === userDeptName))
      );
      return isMatchingDept;
    }
    return false;
  }

  // Resolve target query department
  const qTargetDept = (q.departmentId || q.recipientDepartment || q.department || '').trim().toUpperCase();
  const isMatchingDept = Boolean(
    userDeptCode &&
    qTargetDept &&
    (qTargetDept === userDeptCode || (userDeptName && qTargetDept.toLowerCase() === userDeptName))
  );

  // 4. HOD Recipient check
  // EEE HOD sees HOD/escalation queries of EEE; CSE HOD cannot see EEE queries.
  if (role === 'hod') {
    return isMatchingDept;
  }

  // 5. Faculty Recipient check
  // Faculty only sees queries where they are the recipient or assigned
  if (role === 'faculty') {
    if (isDirectRecipient) return true;
    if (q.assignedTo && user.name && q.assignedTo.toLowerCase().includes(user.name.toLowerCase())) {
      return true;
    }
    // If not specifically targeted to this faculty, faculty cannot see it
    return false;
  }

  // 6. Lab Assistant Recipient check
  if (role === 'lab_assistant') {
    if (isDirectRecipient) return true;
    if (q.recipientRole === 'lab_assistant' || q.recipientType === 'lab_assistant' || q.category === 'lab') {
      return isMatchingDept || !qTargetDept;
    }
    return false;
  }

  return false;
}

/**
 * Filter an array of queries ensuring strict user data isolation
 */
export function filterQueriesForUser(
  queries: AcademicQuery[],
  user: UserProfile | null,
  role: UserRole | null
): AcademicQuery[] {
  if (!queries || queries.length === 0 || !user || !role) {
    return [];
  }
  return queries.filter(q => canUserAccessQuery(q, user, role));
}

/**
 * Security Rule & Database Assertion
 * Throws an error if an unauthorized user attempts to view, reply, or modify a query.
 */
export function assertQueryAccessAuthorized(
  user: UserProfile | null,
  role: UserRole | null,
  q: AcademicQuery,
  action = 'Access Query'
): void {
  if (!user || !role) {
    throw new Error(`Security Violation: Unauthenticated request to ${action}`);
  }
  if (!canUserAccessQuery(q, user, role)) {
    throw new Error(
      `Security Violation: User [${user.name} (${user.id})] is not authorized to ${action} for ticket [${q.ticketId || q.id}].`
    );
  }
}
