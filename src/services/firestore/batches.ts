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
import { AcademicBatch } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';

const COLLECTION = 'batches';

export function subscribeBatches(
  onData: (batches: AcademicBatch[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AcademicBatch[];
      // Sort batches: active first, then descending by endYear
      list.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return (b.endYear || 0) - (a.endYear || 0);
      });
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

export async function getBatches(): Promise<AcademicBatch[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    if (snap.empty) return [];
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as AcademicBatch[];
  } catch (error) {
    console.warn('[getBatches] Database access notice:', error);
    return [];
  }
}

export async function saveBatch(batch: AcademicBatch, actorName = 'Academic Administration'): Promise<void> {
  const path = `${COLLECTION}/${batch.id}`;
  try {
    const docRef = doc(db, COLLECTION, batch.id);
    const payload = sanitizeForFirestore({
      ...batch,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });

    await logAuditEvent({
      actorName,
      actorRole: 'admin',
      action: 'saveBatch',
      entityType: 'department',
      entityId: batch.id,
      metadata: { name: batch.name, status: batch.status }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBatch(batchId: string, actorName = 'Academic Administration'): Promise<void> {
  const path = `${COLLECTION}/${batchId}`;
  try {
    const docRef = doc(db, COLLECTION, batchId);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName,
      actorRole: 'admin',
      action: 'deleteBatch',
      entityType: 'department',
      entityId: batchId,
      metadata: { deletedAt: new Date().toISOString() }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
