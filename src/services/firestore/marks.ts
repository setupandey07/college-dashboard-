import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { AssessmentRecord, AssessmentType, StudentSubjectMarks } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';
import { formatFirestoreDate } from '../../lib/dateUtils';

const ASSESSMENTS_COLLECTION = 'assessments';
const MARKS_COLLECTION = 'marks';
const STUDENT_MARKS_COLLECTION = 'studentMarks';

export const VALID_ASSESSMENT_TYPES: AssessmentType[] = [
  'Minor 1',
  'Minor 2',
  'Mid Sem',
  'End Sem'
];

export function getAssessmentFieldKey(type: AssessmentType): 'minor1' | 'minor2' | 'midSem' | 'endSem' {
  switch (type) {
    case 'Minor 1':
      return 'minor1';
    case 'Minor 2':
      return 'minor2';
    case 'Mid Sem':
      return 'midSem';
    case 'End Sem':
      return 'endSem';
    default:
      throw new Error(`Invalid assessment type: ${type}. Allowed: ${VALID_ASSESSMENT_TYPES.join(', ')}`);
  }
}

export function subscribeAssessments(
  onData: (assessments: AssessmentRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, ASSESSMENTS_COLLECTION);
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
      }) as AssessmentRecord[];
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, ASSESSMENTS_COLLECTION);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export function subscribeStudentMarks(
  onData: (marks: (StudentSubjectMarks & { studentId?: string })[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, STUDENT_MARKS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();

        // 100% database-driven: DO NOT default missing marks to 0!
        // If a mark was never entered, it is strictly null / undefined ("Not Entered")
        const minor1 = typeof data.minor1 === 'number' ? data.minor1 : null;
        const minor2 = typeof data.minor2 === 'number' ? data.minor2 : null;
        const midSem = typeof data.midSem === 'number' ? data.midSem : null;
        const endSem = typeof data.endSem === 'number' ? data.endSem : null;

        // Total marks is calculated strictly from real entered marks, or null if no marks exist
        const enteredMarks = [minor1, minor2, midSem, endSem].filter((m): m is number => m !== null);
        const total = enteredMarks.length > 0
          ? enteredMarks.reduce((acc, curr) => acc + curr, 0)
          : null;

        return {
          id: doc.id,
          studentId: data.studentId || doc.id.split('_')[0],
          studentName: data.studentName || '',
          rollNumber: data.rollNumber || data.usn || '',
          subjectId: data.subjectId || '',
          subjectCode: data.subjectCode || '',
          subjectName: data.subjectName || '',
          departmentId: data.departmentId || '',
          departmentCode: data.departmentCode || '',
          year: data.year,
          section: data.section || '',
          semester: data.semester,
          minor1,
          minor2,
          midSem,
          endSem,
          total,
          grade: data.grade || null,
          updatedAt: data.updatedAt
        };
      }) as (StudentSubjectMarks & { studentId?: string })[];
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, STUDENT_MARKS_COLLECTION);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export interface SaveSingleMarkParams {
  studentId: string;
  studentName?: string;
  rollNumber?: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  departmentCode?: string;
  year?: number;
  section?: string;
  semester?: number;
  assessmentType: AssessmentType;
  marksObtained: number | null;
  maxMarks: number;
  actorName?: string;
  actorRole?: string;
}

/**
 * Commits a single student's mark for a specific assessment.
 * Atomically updates ONLY the targeted assessment field (e.g. minor1).
 * Leaves all other assessment fields (minor2, midSem, endSem) completely untouched.
 */
export async function saveSingleStudentMark(params: SaveSingleMarkParams): Promise<void> {
  const {
    studentId,
    studentName,
    rollNumber,
    subjectId,
    subjectCode,
    subjectName,
    departmentCode,
    year,
    section,
    semester,
    assessmentType,
    marksObtained,
    maxMarks,
    actorName = 'Course Faculty',
    actorRole = 'faculty'
  } = params;

  if (!VALID_ASSESSMENT_TYPES.includes(assessmentType)) {
    throw new Error(`Invalid assessment type: ${assessmentType}. Allowed: ${VALID_ASSESSMENT_TYPES.join(', ')}`);
  }

  if (marksObtained !== null && (marksObtained < 0 || marksObtained > maxMarks)) {
    throw new Error(`Marks obtained (${marksObtained}) must be between 0 and max marks (${maxMarks}).`);
  }

  const fieldKey = getAssessmentFieldKey(assessmentType);
  const studentMarkDocId = `${studentId}_${subjectCode}`;
  const smPath = `${STUDENT_MARKS_COLLECTION}/${studentMarkDocId}`;

  try {
    const smRef = doc(db, STUDENT_MARKS_COLLECTION, studentMarkDocId);
    await setDoc(smRef, sanitizeForFirestore({
      studentId,
      studentName: studentName || '',
      rollNumber: rollNumber || '',
      subjectId,
      subjectCode,
      subjectName,
      departmentCode: departmentCode || '',
      year: year || null,
      section: section || '',
      semester: semester || null,
      [fieldKey]: marksObtained,
      updatedAt: serverTimestamp()
    }), { merge: true });

    await logAuditEvent({
      actorName,
      actorRole: (actorRole as any) || 'faculty',
      action: 'saveSingleStudentMark',
      entityType: 'marks',
      entityId: studentMarkDocId,
      metadata: {
        assessmentType,
        fieldKey,
        studentId,
        subjectCode,
        marksObtained,
        maxMarks
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, smPath);
  }
}

/**
 * Commits an assessment record and updates studentMarks for each evaluated student.
 * Updates ONLY the selected assessment field for each student, never touching others.
 */
export async function saveAssessmentRecord(
  record: AssessmentRecord,
  actorName = 'Course Faculty',
  actorRole = 'faculty'
): Promise<void> {
  if (!VALID_ASSESSMENT_TYPES.includes(record.assessmentType)) {
    throw new Error(`Invalid assessment type: ${record.assessmentType}. Must be one of: ${VALID_ASSESSMENT_TYPES.join(', ')}`);
  }

  const fieldKey = getAssessmentFieldKey(record.assessmentType);
  const path = `${ASSESSMENTS_COLLECTION}/${record.id}`;

  try {
    const batch = writeBatch(db);

    // 1. Assessment Parent Record
    const assRef = doc(db, ASSESSMENTS_COLLECTION, record.id);
    batch.set(assRef, sanitizeForFirestore({
      ...record,
      updatedAt: serverTimestamp()
    }), { merge: true });

    // 2. Individual student mark entries
    if (record.entries && record.entries.length > 0) {
      for (const entry of record.entries) {
        // Skip unentered entries or persist valid mark
        if (entry.marksObtained !== null && entry.marksObtained !== undefined) {
          const markId = `${record.id}_${entry.studentId}`;
          const markRef = doc(db, MARKS_COLLECTION, markId);
          batch.set(markRef, sanitizeForFirestore({
            assessmentId: record.id,
            studentId: entry.studentId,
            studentName: entry.studentName,
            studentRoll: entry.usn,
            subjectId: record.subjectId,
            subjectCode: record.subjectCode,
            assessmentType: record.assessmentType,
            maxMarks: record.maxMarks,
            marksObtained: entry.marksObtained,
            grade: entry.grade || null,
            remarks: entry.remarks || '',
            date: record.date,
            updatedAt: serverTimestamp()
          }), { merge: true });

          // Update studentMarks atomically with only the targeted assessment field
          const studentMarkDocId = `${entry.studentId}_${record.subjectCode}`;
          const smRef = doc(db, STUDENT_MARKS_COLLECTION, studentMarkDocId);

          batch.set(smRef, sanitizeForFirestore({
            studentId: entry.studentId,
            studentName: entry.studentName,
            rollNumber: entry.usn,
            subjectId: record.subjectId,
            subjectCode: record.subjectCode,
            subjectName: record.subjectName,
            departmentCode: record.departmentCode || '',
            year: record.year || null,
            section: record.section || '',
            semester: record.semester,
            [fieldKey]: entry.marksObtained,
            updatedAt: serverTimestamp()
          }), { merge: true });
        }
      }
    }

    await batch.commit();

    await logAuditEvent({
      actorName,
      actorRole: (actorRole as any) || 'faculty',
      action: 'saveAssessmentRecord',
      entityType: 'marks',
      entityId: record.id,
      metadata: {
        assessmentType: record.assessmentType,
        fieldKey,
        subjectCode: record.subjectCode,
        evaluatedCount: record.entries?.filter(e => e.marksObtained !== null).length || 0
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveStudentSubjectMarks(
  studentMarks: StudentSubjectMarks & { studentId?: string }
): Promise<void> {
  const studentId = studentMarks.studentId;
  if (!studentId) return;
  const docId = `${studentId}_${studentMarks.subjectCode}`;
  const path = `${STUDENT_MARKS_COLLECTION}/${docId}`;

  try {
    const docRef = doc(db, STUDENT_MARKS_COLLECTION, docId);
    await setDoc(docRef, sanitizeForFirestore({
      ...studentMarks,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAssessmentRecord(
  assessmentId: string,
  actorName = 'Course Faculty / Admin'
): Promise<void> {
  const path = `${ASSESSMENTS_COLLECTION}/${assessmentId}`;
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, assessmentId);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName,
      actorRole: 'admin',
      action: 'deleteAssessmentRecord',
      entityType: 'marks',
      entityId: assessmentId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
