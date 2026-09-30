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
import { AssessmentRecord, StudentSubjectMarks } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';
import { formatFirestoreDate } from '../../lib/dateUtils';

const ASSESSMENTS_COLLECTION = 'assessments';
const MARKS_COLLECTION = 'marks';
const STUDENT_MARKS_COLLECTION = 'studentMarks';

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
        const cia1 = data.cia1 ?? 0;
        const cia2 = data.cia2 ?? 0;
        const assignment = data.assignment ?? 0;
        const modelExam = data.modelExam ?? 0;
        const totalInternal = data.totalInternal ?? Math.min(50, Math.round(((cia1 + cia2) / 2) + (assignment * 0.5)));
        const calculateGrade = (total: number) => {
          if (total >= 45) return 'O';
          if (total >= 40) return 'A+';
          if (total >= 35) return 'A';
          if (total >= 30) return 'B+';
          if (total >= 25) return 'B';
          return 'RA';
        };
        return {
          id: doc.id,
          studentId: data.studentId || doc.id.split('_')[0],
          subjectId: data.subjectId,
          subjectCode: data.subjectCode,
          subjectName: data.subjectName,
          cia1,
          cia2,
          assignment,
          practical: data.practical,
          modelExam,
          totalInternal,
          maxInternal: data.maxInternal ?? 50,
          grade: data.grade || calculateGrade(totalInternal)
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

export async function saveAssessmentRecord(
  record: AssessmentRecord,
  actorName = 'Course Faculty'
): Promise<void> {
  const path = `${ASSESSMENTS_COLLECTION}/${record.id}`;
  try {
    const batch = writeBatch(db);

    // 1. Assessment Parent Record
    const assRef = doc(db, ASSESSMENTS_COLLECTION, record.id);
    batch.set(assRef, sanitizeForFirestore({
      ...record,
      updatedAt: serverTimestamp()
    }), { merge: true });

    // 2. Individual student mark entries with deterministic IDs
    if (record.entries && record.entries.length > 0) {
      for (const entry of record.entries) {
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
          grade: entry.grade,
          remarks: entry.remarks || '',
          date: record.date,
          updatedAt: serverTimestamp()
        }), { merge: true });

        // Update studentMarks in STUDENT_MARKS_COLLECTION for each evaluated student
        const studentMarkDocId = `${entry.studentId}_${record.subjectCode}`;
        const smRef = doc(db, STUDENT_MARKS_COLLECTION, studentMarkDocId);
        const updateField =
          record.assessmentType === 'CIA-1' ? { cia1: entry.marksObtained } :
          record.assessmentType === 'CIA-2' ? { cia2: entry.marksObtained } :
          record.assessmentType === 'Model Exam' ? { modelExam: entry.marksObtained } :
          record.assessmentType === 'Assignment' ? { assignment: entry.marksObtained } :
          record.assessmentType === 'Practical / Viva' ? { practical: entry.marksObtained } : {};

        batch.set(smRef, sanitizeForFirestore({
          studentId: entry.studentId,
          subjectId: record.subjectId,
          subjectCode: record.subjectCode,
          subjectName: record.subjectName,
          ...updateField,
          updatedAt: serverTimestamp()
        }), { merge: true });
      }
    }

    await batch.commit();

    await logAuditEvent({
      actorName,
      actorRole: 'faculty',
      action: 'saveAssessmentRecord',
      entityType: 'marks',
      entityId: record.id,
      metadata: {
        assessmentType: record.assessmentType,
        subjectCode: record.subjectCode,
        averageScore: record.averageScore
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
    await setDoc(docRef, {
      studentId,
      ...studentMarks,
      updatedAt: serverTimestamp()
    }, { merge: true });
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

