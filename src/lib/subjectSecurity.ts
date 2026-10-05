import { UserProfile, UserRole, Subject } from '../types';

export interface SubjectAuthCheckResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Normalizes code/name strings for robust, case-insensitive comparison.
 */
function normalize(val?: string): string {
  return (val || '').trim().toUpperCase();
}

/**
 * Verifies whether a given user is authorized to perform subject-specific operations
 * (syllabus edit, syllabus coverage toggle, attendance marking, marks entry/update).
 *
 * Rules:
 * 1. Admin: Global access across all departments and subjects.
 * 2. HOD: Access ONLY to subjects belonging to their own department.
 * 3. Faculty / Lab Assistant:
 *    - Must belong to the subject's department (department isolation).
 *    - MUST be explicitly assigned to the subject (in assignedSubjectIds or legacy assignedSubjectId).
 * 4. Students / Unknown: Denied write operations.
 */
export function isSubjectOperationAuthorized(
  user: UserProfile | null | undefined,
  role: UserRole | null | undefined,
  subjectId: string,
  subjects: Subject[]
): SubjectAuthCheckResult {
  if (!user || !role) {
    return {
      authorized: false,
      reason: 'Authentication required: User session is missing or unverified.'
    };
  }

  // 1. Admin retains global management access across the entire institution
  if (role === 'admin') {
    return { authorized: true };
  }

  // Find target subject in database subjects
  const subject = subjects.find(s => s.id === subjectId || s.code === subjectId);
  if (!subject) {
    return {
      authorized: false,
      reason: `Subject with ID '${subjectId}' was not found in the institutional curriculum.`
    };
  }

  const userDeptCode = normalize(user.departmentCode);
  const userDeptName = normalize(user.department);
  const subDeptCode = normalize(subject.departmentCode);
  const subDeptName = normalize(subject.department);

  const isDepartmentMatch =
    (userDeptCode && (userDeptCode === subDeptCode || userDeptName === subDeptName || subDeptName.includes(userDeptCode))) ||
    (!userDeptCode && userDeptName && (userDeptName === subDeptName || subDeptName.includes(userDeptName)));

  // 2. HOD retains department-level permissions
  if (role === 'hod') {
    if (isDepartmentMatch) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: `Department Access Denied: Subject '${subject.name}' (${subject.code}) belongs to ${subject.departmentCode || subject.department}, but you are HOD of ${user.departmentCode || user.department}.`
    };
  }

  // 3. Faculty and Lab Assistant: Strictly restricted to assigned subjects within their department
  if (role === 'faculty' || role === 'lab_assistant') {
    // A. Department isolation check
    if (!isDepartmentMatch) {
      return {
        authorized: false,
        reason: `Department Isolation Violation: You belong to ${user.departmentCode || user.department}, and cannot access subjects in ${subject.departmentCode || subject.department}.`
      };
    }

    // B. Explicit subject assignment check
    const assignedIds = new Set<string>();
    if (Array.isArray(user.assignedSubjectIds)) {
      user.assignedSubjectIds.forEach(id => assignedIds.add(id));
    }
    if (user.assignedSubjectId) {
      assignedIds.add(user.assignedSubjectId);
    }

    const isAssigned =
      assignedIds.has(subject.id) ||
      assignedIds.has(subject.code) ||
      subject.facultyId === user.id;

    if (isAssigned) {
      return { authorized: true };
    }

    return {
      authorized: false,
      reason: `Access Restricted: Course '${subject.name}' (${subject.code}) is not assigned to you. Only assigned ${role === 'faculty' ? 'faculty' : 'lab assistants'} may manage its syllabus, attendance, or marks.`
    };
  }

  // 4. Students or unhandled roles
  return {
    authorized: false,
    reason: `Role '${role}' is not authorized to perform staff academic operations.`
  };
}

/**
 * Asserts subject operation authorization. Throws an Error with a descriptive security message if denied.
 * Use before every sensitive database mutation.
 */
export function assertSubjectOperationAuthorized(
  user: UserProfile | null | undefined,
  role: UserRole | null | undefined,
  subjectId: string,
  subjects: Subject[],
  operationName: string
): void {
  const check = isSubjectOperationAuthorized(user, role, subjectId, subjects);
  if (!check.authorized) {
    const errorMsg = `[SECURITY_UNAUTHORIZED] Action '${operationName}' rejected for user '${user?.name || 'unknown'}' (${role || 'none'}): ${check.reason}`;
    console.error(errorMsg);
    throw new Error(check.reason || `Security Violation: You are not authorized to perform '${operationName}'.`);
  }
}
