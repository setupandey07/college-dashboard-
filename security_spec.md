# AcademicCore Firebase Security Specification

## 1. Data Invariants
- **Identity & Privilege Isolation**: A user cannot modify their own `role` or self-assign `admin`, `hod`, or `faculty` privileges.
- **Academic Integrity**: Students are strictly forbidden from writing or modifying `attendance`, `attendanceSessions`, `assessments`, `marks`, `subjects`, or `departments`.
- **Contact Hours & Syllabus Integrity**: Only designated course faculty or academic administrators can update syllabus progress, hours conducted, and topic completion states.
- **Audit Immutability**: `auditLogs` records are append-only. Deletion and modification of audit records are forbidden.
- **Grievance Redressal**: Students can create grievance queries and read their own queries. Staff and administrators can post official responses and advance ticket statuses.
- **Bounded Resource Allocations**: All string fields and array lists are bounded to prevent Denial of Wallet resource attacks.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Privilege Escalation Attack)**: A student attempts to update `users/{studentId}` with `role: "admin"`.
2. **Payload 2 (Shadow Update / Ghost Field Attack)**: An attacker submits an extra unvalidated field `isVerifiedAdmin: true` into a profile update.
3. **Payload 3 (Student Attendance Forgery)**: A student attempts to create an attendance record in `/attendance/{recordId}` marking themselves 'present'.
4. **Payload 4 (Marks Tampering Attack)**: A student attempts to write `/marks/{markId}` changing `marksObtained: 50`.
5. **Payload 5 (Syllabus Falsification Attack)**: An unauthenticated actor attempts to mark all syllabus units as completed.
6. **Payload 6 (PII Scraping Attack)**: A non-admin user attempts a blanket query across all private user emails in `/users`.
7. **Payload 7 (Audit Log Destruction)**: A compromised account attempts to issue a `delete` on an `/auditLogs/{logId}` document.
8. **Payload 8 (Department Metric Poisoning)**: A non-admin user attempts to alter `studentCount` or `facultyCount` in `/departments/{deptId}`.
9. **Payload 9 (Denial of Wallet String Injection)**: An attacker injects a 1.5MB junk payload into `query.description`.
10. **Payload 10 (Terminal State Bypass)**: Attempting to reopen a `resolved` grievance ticket without administrative authorization.
11. **Payload 11 (Anonymous Vandalism)**: An unauthenticated user attempts to create circulars in `/announcements`.
12. **Payload 12 (Lab Inventory Tampering)**: An unauthorized student attempts to mark expensive lab equipment as 'scrapped' or modify working quantities.

---

## 3. Test Runner Definition (`firestore.rules.test.ts`)
```typescript
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

// Dirty Dozen Test Cases ensuring PERMISSION_DENIED on all unauthorized operations
describe('AcademicCore Zero-Trust Security Rules', () => {
  it('rejects student attempting to change their role to admin', async () => {
    // Assert assertFails on user role modification
  });

  it('rejects student writing to attendance collections', async () => {
    // Assert assertFails on attendance session create by student
  });

  it('rejects student writing to marks collections', async () => {
    // Assert assertFails on marks create/update by student
  });

  it('rejects unauthenticated read/write to audit logs', async () => {
    // Assert assertFails on auditLogs modification
  });
});
```
