/**
 * Authentication and Institutional Identity Helpers
 * National Institute of Technology Andhra Pradesh — AcademicCore
 */

export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Validates whether the email matches the EXACT institutional student domain:
 * @student.nitandhra.ac.in
 *
 * Rejects all spoofed/subdomain variants such as:
 * - @student.nitandhra.com
 * - @student.nitandhra.edu
 * - @student.nitandhra.ac.in.fake.com
 * - student.nitandhra.ac.in@gmail.com
 */
export function isExactNitAndhraStudentDomain(email: string): boolean {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return domain === 'student.nitandhra.ac.in';
}

/**
 * Checks if the email was an attempt to sign in with an invalid/unofficial student domain variation.
 */
export function isAttemptedStudentDomain(email: string): boolean {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  
  if (domain === 'student.nitandhra.ac.in') return true;
  
  // Detect fake / misspelled / alternative student domains
  if (
    domain.includes('nitandhra') ||
    domain.startsWith('student.') ||
    domain.includes('.nitandhra.')
  ) {
    return true;
  }
  return false;
}

/**
 * Explicit allowlisted Development Admin identities.
 * Strictly prevents loose checks (e.g. email.includes('admin') or email.endsWith('@gmail.com')).
 *
 * Current development Admin identifier: startup5077
 * Runtime admin email: pkr02042006@gmail.com
 */
const ALLOWLISTED_DEV_ADMIN_EMAILS = new Set<string>([
  'pkr02042006@gmail.com',
  'startup5077@gmail.com',
  'startup5077@academiccore.edu',
  'startup5077',
  '525077@student.nitandhra.ac.in',
  '525077',
  'principal@academiccore.edu'
]);

const ALLOWLISTED_DEV_ADMIN_UIDS = new Set<string>([
  'startup5077',
  '525077',
  'u-admin-1'
]);

export function isAuthorizedDevAdminIdentity(email: string, uid?: string): boolean {
  const normEmail = normalizeEmail(email);
  const normUid = (uid || '').trim().toLowerCase();

  if (normUid && ALLOWLISTED_DEV_ADMIN_UIDS.has(normUid)) {
    return true;
  }
  if (normEmail && ALLOWLISTED_DEV_ADMIN_EMAILS.has(normEmail)) {
    return true;
  }
  return false;
}
