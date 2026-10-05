import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { MasterNote } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';
import { compareDatesDesc } from '../../lib/dateUtils';

const COLLECTION = 'notes';

export function subscribeNotes(
  onData: (notes: MasterNote[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as MasterNote[];
      // Sort by upload date descending
      list.sort((a, b) => compareDatesDesc(a.uploadedAt, b.uploadedAt));
      onData(list);
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

export async function getNotes(): Promise<MasterNote[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    if (snap.empty) return [];
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as MasterNote[];
  } catch (error) {
    console.warn('[getNotes] Database access notice:', error);
    return [];
  }
}

export async function saveNote(
  note: MasterNote,
  actorName = 'Course Faculty',
  actorRole = 'faculty'
): Promise<void> {
  const path = `${COLLECTION}/${note.id}`;
  try {
    const docRef = doc(db, COLLECTION, note.id);
    const payload = sanitizeForFirestore({
      ...note,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });

    await logAuditEvent({
      actorName,
      actorRole: actorRole as any,
      action: 'saveNote',
      entityType: 'department',
      entityId: note.id,
      metadata: {
        title: note.title,
        department: note.departmentCode,
        subject: note.subjectCode,
        batch: note.batch
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNote(
  noteId: string,
  actorName = 'Course Faculty',
  actorRole = 'faculty'
): Promise<void> {
  const path = `${COLLECTION}/${noteId}`;
  try {
    const docRef = doc(db, COLLECTION, noteId);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName,
      actorRole: actorRole as any,
      action: 'deleteNote',
      entityType: 'department',
      entityId: noteId,
      metadata: { deletedAt: new Date().toISOString() }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
