import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { Subject, SyllabusUnit } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';

const COLLECTION = 'subjects';

export function subscribeSubjects(
  onData: (subjects: Subject[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const subs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subject[];
      onData(subs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, COLLECTION);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function getSubjects(): Promise<Subject[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Subject[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION);
  }
}

export async function saveSubject(subject: Subject): Promise<void> {
  const path = `${COLLECTION}/${subject.id}`;
  try {
    const docRef = doc(db, COLLECTION, subject.id);
    const payload = sanitizeForFirestore({
      ...subject,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createSubject(subject: Subject): Promise<Subject> {
  const path = `${COLLECTION}/${subject.id}`;
  try {
    const docRef = doc(db, COLLECTION, subject.id);
    const payload = sanitizeForFirestore({
      ...subject,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload);

    await logAuditEvent({
      actorName: 'Faculty / Admin',
      actorRole: 'admin',
      action: 'createSubject',
      entityType: 'syllabus',
      entityId: subject.id,
      metadata: { code: subject.code, name: subject.name }
    });

    return subject;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateSubject(
  subjectId: string,
  data: Partial<Subject>
): Promise<void> {
  const path = `${COLLECTION}/${subjectId}`;
  try {
    const docRef = doc(db, COLLECTION, subjectId);
    const payload = sanitizeForFirestore({
      ...data,
      updatedAt: serverTimestamp()
    });
    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const path = `${COLLECTION}/${subjectId}`;
  try {
    const docRef = doc(db, COLLECTION, subjectId);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName: 'Faculty / Admin',
      actorRole: 'admin',
      action: 'deleteSubject',
      entityType: 'syllabus',
      entityId: subjectId,
      metadata: { deleted: true }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateSubjectSyllabus(
  subjectId: string,
  units: SyllabusUnit[],
  hoursConducted: number,
  status: Subject['status'],
  actorName = 'Course Faculty'
): Promise<void> {
  const path = `${COLLECTION}/${subjectId}`;
  try {
    const docRef = doc(db, COLLECTION, subjectId);
    const payload = sanitizeForFirestore({
      units,
      hoursConducted,
      status,
      updatedAt: serverTimestamp()
    });
    await updateDoc(docRef, payload);

    await logAuditEvent({
      actorName,
      actorRole: 'faculty',
      action: 'updateSubjectSyllabus',
      entityType: 'syllabus',
      entityId: subjectId,
      metadata: { hoursConducted, status }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
