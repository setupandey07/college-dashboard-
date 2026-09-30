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
import { LabEquipment } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';

const COLLECTION = 'labEquipment';

export function subscribeLabEquipment(
  onData: (equipment: LabEquipment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LabEquipment[];
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

export async function saveLabEquipment(
  item: LabEquipment
): Promise<void> {
  const path = `${COLLECTION}/${item.id}`;
  try {
    const docRef = doc(db, COLLECTION, item.id);
    const payload = sanitizeForFirestore({
      ...item,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createLabEquipment(
  item: LabEquipment
): Promise<LabEquipment> {
  const path = `${COLLECTION}/${item.id}`;
  try {
    const docRef = doc(db, COLLECTION, item.id);
    const payload = sanitizeForFirestore({
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload);

    await logAuditEvent({
      actorName: 'Lab In-Charge',
      actorRole: 'lab_assistant',
      action: 'createLabEquipment',
      entityType: 'equipment',
      entityId: item.id,
      metadata: { equipmentName: item.equipmentName, labName: item.labName }
    });

    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function deleteLabEquipment(equipmentId: string): Promise<void> {
  const path = `${COLLECTION}/${equipmentId}`;
  try {
    const docRef = doc(db, COLLECTION, equipmentId);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName: 'Lab In-Charge',
      actorRole: 'lab_assistant',
      action: 'deleteLabEquipment',
      entityType: 'equipment',
      entityId: equipmentId,
      metadata: { deleted: true }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateLabEquipmentStatus(
  equipmentId: string,
  workingCount: number,
  maintenanceCount: number,
  status: LabEquipment['status'],
  actorName = 'Lab Technician / Assistant'
): Promise<void> {
  const path = `${COLLECTION}/${equipmentId}`;
  try {
    const docRef = doc(db, COLLECTION, equipmentId);
    const payload = sanitizeForFirestore({
      workingCount,
      maintenanceCount,
      status,
      lastServiced: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp()
    });
    await updateDoc(docRef, payload);

    await logAuditEvent({
      actorName,
      actorRole: 'lab_assistant',
      action: 'updateLabEquipmentStatus',
      entityType: 'equipment',
      entityId: equipmentId,
      metadata: { workingCount, maintenanceCount, status }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
