import {
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { WorkloadItem } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';

const COLLECTION = 'workloads';

export function subscribeWorkloads(
  onData: (workloads: WorkloadItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        facultyId: doc.id,
        ...doc.data()
      })) as WorkloadItem[];
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

export async function saveWorkload(
  workload: WorkloadItem
): Promise<void> {
  const path = `${COLLECTION}/${workload.facultyId}`;
  try {
    const docRef = doc(db, COLLECTION, workload.facultyId);
    const payload = sanitizeForFirestore({
      ...workload,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
