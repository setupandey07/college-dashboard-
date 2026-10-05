import {
  collection,
  doc,
  getDoc,
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
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        const total = Number(data.totalClasses) || 0;
        const attended = Number(data.attendedClasses) || 0;
        const absent = data.absentClasses !== undefined ? Number(data.absentClasses) : Math.max(0, total - attended);
        const percentage = data.percentage !== undefined ? Number(data.percentage) : (total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0);

        return {
          id: doc.id,
          studentId: data.studentId || '',
          usn: data.usn || data.studentRoll || '',
          studentName: data.studentName || '',
          subjectId: data.subjectId || '',
          subjectCode: data.subjectCode || '',
          subjectName: data.subjectName || '',
          totalClasses: total,
          attendedClasses: attended,
          absentClasses: absent,
          percentage,
          facultyName: data.facultyName || 'Course Faculty',
          lastAttended: data.lastAttended || '',
          status: data.status || (percentage >= 75 ? 'safe' : percentage >= 65 ? 'warning' : 'critical')
        };
      }) as StudentSubjectAttendance[];
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

export async function recalculateStudentAttendance(
  studentId: string,
  subjectCode: string,
  usn?: string,
  subjectId?: string,
  subjectName?: string,
  facultyName?: string
): Promise<void> {
  try {
    // Single-field queries to avoid any Firestore composite index requirement
    const q1 = query(
      collection(db, RECORDS_COLLECTION),
      where('studentId', '==', studentId)
    );
    const snap1 = await getDocs(q1);

    const docMap = new Map<string, any>();
    for (const d of snap1.docs) {
      const data = d.data();
      if (
        data.subjectCode === subjectCode ||
        (subjectId && data.subjectId === subjectId)
      ) {
        docMap.set(d.id, data);
      }
    }

    // If USN differs from studentId, also merge any records saved under USN
    if (usn && usn !== studentId) {
      const q2 = query(
        collection(db, RECORDS_COLLECTION),
        where('studentRoll', '==', usn)
      );
      const snap2 = await getDocs(q2);
      for (const d of snap2.docs) {
        const data = d.data();
        if (
          data.subjectCode === subjectCode ||
          (subjectId && data.subjectId === subjectId)
        ) {
          docMap.set(d.id, data);
        }
      }
    }

    const allRecords = Array.from(docMap.values());
    const total = allRecords.length;
    const attended = allRecords.filter(d => d.status === 'present').length;
    const absent = Math.max(0, total - attended);
    const percentage = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0;
    const status = percentage >= 75 ? 'safe' : percentage >= 65 ? 'warning' : 'critical';

    const firstDoc = allRecords[0];
    const resolvedSubjectId = subjectId || firstDoc?.subjectId || '';
    const resolvedSubjectName = subjectName || firstDoc?.subjectName || subjectCode;
    const resolvedFacultyName = facultyName || firstDoc?.facultyName || 'Course Faculty';
    const resolvedStudentName = firstDoc?.studentName || '';
    const resolvedUsn = usn || firstDoc?.usn || firstDoc?.studentRoll || '';

    const presentDates = allRecords
      .filter(d => d.status === 'present')
      .map(d => d.date)
      .filter(Boolean);
    presentDates.sort(compareDatesDesc);
    const lastAttended = presentDates[0] || '';

    const canonicalDocId = `${studentId}_${subjectCode}`;
    const summaryRef = doc(db, SUMMARIES_COLLECTION, canonicalDocId);

    if (total === 0) {
      await deleteDoc(summaryRef).catch(() => {});
      if (resolvedUsn && resolvedUsn !== studentId) {
        await deleteDoc(doc(db, SUMMARIES_COLLECTION, `${resolvedUsn}_${subjectCode}`)).catch(() => {});
      }
    } else {
      const summaryPayload = sanitizeForFirestore({
        id: canonicalDocId,
        studentId,
        usn: resolvedUsn,
        studentName: resolvedStudentName,
        subjectId: resolvedSubjectId,
        subjectCode,
        subjectName: resolvedSubjectName,
        facultyName: resolvedFacultyName,
        totalClasses: total,
        attendedClasses: attended,
        absentClasses: absent,
        percentage,
        lastAttended,
        status,
        updatedAt: serverTimestamp()
      });

      // Save strictly one canonical document to prevent collection pollution
      await setDoc(summaryRef, summaryPayload, { merge: true });

      // Clean up any legacy duplicate document keyed by USN
      if (resolvedUsn && resolvedUsn !== studentId) {
        await deleteDoc(doc(db, SUMMARIES_COLLECTION, `${resolvedUsn}_${subjectCode}`)).catch(() => {});
      }
    }
  } catch (err) {
    console.warn(`[recalculateStudentAttendance] Notice for ${studentId} ${subjectCode}:`, err);
  }
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
      id: sessionId,
      status: 'submitted',
      facultyName: sessionData.facultyName || actorName,
      submittedAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }), { merge: true });

    // 2. Individual student attendance records using deterministic IDs: `${sessionId}_${rec.studentId}`
    if (sessionData.records && sessionData.records.length > 0) {
      for (const rec of sessionData.records) {
        const recordId = `${sessionId}_${rec.studentId}`;
        const recordRef = doc(db, RECORDS_COLLECTION, recordId);
        batch.set(recordRef, sanitizeForFirestore({
          id: recordId,
          sessionId,
          studentId: rec.studentId,
          studentName: rec.studentName,
          studentRoll: rec.usn,
          usn: rec.usn,
          subjectId: sessionData.subjectId,
          subjectCode: sessionData.subjectCode,
          subjectName: sessionData.subjectName,
          facultyId: sessionData.facultyId,
          facultyName: sessionData.facultyName || actorName,
          date: sessionData.date,
          slot: sessionData.slot,
          status: rec.status, // 'present' | 'absent' | 'late'
          section: sessionData.section,
          semester: sessionData.semester,
          topicCovered: sessionData.topicCovered || '',
          updatedAt: serverTimestamp()
        }), { merge: true });
      }
    }

    await batch.commit();

    // 3. Authoritatively recalculate student attendance summaries from the committed database records
    if (sessionData.records && sessionData.records.length > 0) {
      await Promise.all(
        sessionData.records.map(rec =>
          recalculateStudentAttendance(
            rec.studentId,
            sessionData.subjectCode,
            rec.usn,
            sessionData.subjectId,
            sessionData.subjectName,
            sessionData.facultyName || actorName
          )
        )
      );
    }

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
    await setDoc(docRef, sanitizeForFirestore({
      id: docId,
      studentId,
      ...summary,
      updatedAt: serverTimestamp()
    }), { merge: true });
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
    const absent = Math.max(0, totalClasses - attendedClasses);
    const percentage = Number(((attendedClasses / Math.max(1, totalClasses)) * 100).toFixed(1));
    await setDoc(docRef, sanitizeForFirestore({
      attendedClasses,
      totalClasses,
      absentClasses: absent,
      percentage,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAttendanceSession(sessionId: string): Promise<void> {
  const path = `${SESSIONS_COLLECTION}/${sessionId}`;
  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    const sessionData = sessionSnap.exists() ? (sessionSnap.data() as AttendanceSession) : null;

    // Delete all records in 'attendance' collection associated with this sessionId
    const q = query(collection(db, RECORDS_COLLECTION), where('sessionId', '==', sessionId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(sessionRef);
    await batch.commit();

    // Recalculate summaries for each affected student
    if (sessionData && sessionData.records && sessionData.records.length > 0) {
      await Promise.all(
        sessionData.records.map(rec =>
          recalculateStudentAttendance(
            rec.studentId,
            sessionData.subjectCode,
            rec.usn,
            sessionData.subjectId,
            sessionData.subjectName,
            sessionData.facultyName
          )
        )
      );
    }

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

