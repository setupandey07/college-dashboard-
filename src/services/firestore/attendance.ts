import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { AttendanceSession, StudentSubjectAttendance } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';
import { formatFirestoreDate, compareDatesDesc } from '../../lib/dateUtils';

const SESSIONS_COLLECTION = 'attendanceSessions';
const RECORDS_COLLECTION = 'attendance';
const SUMMARIES_COLLECTION = 'attendanceSummaries';

export function subscribeAttendanceSessions(
  onData: (sessions: AttendanceSession[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, SESSIONS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: formatFirestoreDate(data.date, typeof data.date === 'string' ? data.date : '')
        };
      }) as AttendanceSession[];
      // Sort by date/timestamp descending
      list.sort((a, b) => compareDatesDesc(a.date, b.date));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, SESSIONS_COLLECTION);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export function subscribeStudentAttendanceSummaries(
  onData: (summaries: StudentSubjectAttendance[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, SUMMARIES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        subjectId: doc.data().subjectId,
        subjectCode: doc.data().subjectCode,
        subjectName: doc.data().subjectName,
        totalClasses: doc.data().totalClasses,
        attendedClasses: doc.data().attendedClasses,
        percentage: doc.data().percentage,
        facultyName: doc.data().facultyName
      })) as StudentSubjectAttendance[];
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, SUMMARIES_COLLECTION);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function saveAttendanceSession(
  sessionData: AttendanceSession,
  actorName = 'Course Faculty'
): Promise<void> {
  const sessionId = sessionData.id;
  const path = `${SESSIONS_COLLECTION}/${sessionId}`;

  try {
    const batch = writeBatch(db);

    // 1. Session Document
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    batch.set(sessionRef, sanitizeForFirestore({
      ...sessionData,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }), { merge: true });

    // 2. Individual student attendance records using deterministic IDs: `${sessionId}_${studentId}`
    if (sessionData.records && sessionData.records.length > 0) {
      for (const rec of sessionData.records) {
        const recordId = `${sessionId}_${rec.studentId}`;
        const recordRef = doc(db, RECORDS_COLLECTION, recordId);
        batch.set(recordRef, sanitizeForFirestore({
          sessionId,
          studentId: rec.studentId,
          studentName: rec.studentName,
          studentRoll: rec.usn,
          subjectId: sessionData.subjectId,
          subjectCode: sessionData.subjectCode,
          facultyId: sessionData.facultyId,
          date: sessionData.date,
          status: rec.status,
          section: sessionData.section,
          semester: sessionData.semester,
          updatedAt: serverTimestamp()
        }), { merge: true });

        // Update attendance summary for this student in real-time
        const summaryDocId = `${rec.studentId}_${sessionData.subjectCode}`;
        const summaryRef = doc(db, SUMMARIES_COLLECTION, summaryDocId);
        batch.set(summaryRef, sanitizeForFirestore({
          studentId: rec.studentId,
          subjectCode: sessionData.subjectCode,
          subjectName: sessionData.subjectName,
          updatedAt: serverTimestamp()
        }), { merge: true });
      }
    }

    await batch.commit();

    await logAuditEvent({
      actorName,
      actorRole: 'faculty',
      action: 'saveAttendanceSession',
      entityType: 'attendance',
      entityId: sessionId,
      metadata: {
        subjectCode: sessionData.subjectCode,
        date: sessionData.date,
        total: sessionData.totalStudents,
        present: sessionData.presentCount
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveStudentAttendanceSummary(
  summary: StudentSubjectAttendance & { studentId?: string }
): Promise<void> {
  const studentId = summary.studentId;
  if (!studentId) return;
  const docId = `${studentId}_${summary.subjectCode}`;
  const path = `${SUMMARIES_COLLECTION}/${docId}`;

  try {
    const docRef = doc(db, SUMMARIES_COLLECTION, docId);
    await setDoc(docRef, {
      studentId,
      ...summary,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateStudentAttendancePercentage(
  studentId: string,
  subjectCode: string,
  attendedClasses: number,
  totalClasses: number
): Promise<void> {
  const docId = `${studentId}_${subjectCode}`;
  const path = `${SUMMARIES_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, SUMMARIES_COLLECTION, docId);
    const percentage = Number(((attendedClasses / Math.max(1, totalClasses)) * 100).toFixed(1));
    await setDoc(docRef, {
      attendedClasses,
      totalClasses,
      percentage,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAttendanceSession(sessionId: string): Promise<void> {
  const path = `${SESSIONS_COLLECTION}/${sessionId}`;
  try {
    await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
    await logAuditEvent({
      actorName: 'System/Faculty',
      actorRole: 'faculty',
      action: 'deleteAttendanceSession',
      entityType: 'attendance',
      entityId: sessionId,
      metadata: { sessionId }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

