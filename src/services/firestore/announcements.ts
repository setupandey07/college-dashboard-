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
import { Announcement } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';
import { formatFirestoreDate, compareDatesDesc } from '../../lib/dateUtils';

const COLLECTION = 'announcements';

export function subscribeAnnouncements(
  onData: (announcements: Announcement[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: formatFirestoreDate(data.date, new Date().toISOString().split('T')[0])
        };
      }) as Announcement[];
      // Pinned first, then by date descending
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return compareDatesDesc(a.date, b.date);
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

export async function createAnnouncement(
  announcement: Announcement
): Promise<void> {
  const path = `${COLLECTION}/${announcement.id}`;
  try {
    const docRef = doc(db, COLLECTION, announcement.id);
    const payload = sanitizeForFirestore({
      ...announcement,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload);

    await logAuditEvent({
      actorName: announcement.authorName,
      actorRole: announcement.authorRole,
      action: 'createAnnouncement',
      entityType: 'announcement',
      entityId: announcement.id,
      metadata: { title: announcement.title, category: announcement.category }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Announcement>
): Promise<void> {
  const path = `${COLLECTION}/${id}`;
  try {
    const docRef = doc(db, COLLECTION, id);
    const payload = sanitizeForFirestore({
      ...data,
      updatedAt: serverTimestamp()
    });
    await updateDoc(docRef, payload);

    await logAuditEvent({
      actorName: 'Admin',
      actorRole: 'admin',
      action: 'updateAnnouncement',
      entityType: 'announcement',
      entityId: id,
      metadata: { updatedFields: Object.keys(data) }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const path = `${COLLECTION}/${id}`;
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName: 'Admin',
      actorRole: 'admin',
      action: 'deleteAnnouncement',
      entityType: 'announcement',
      entityId: id,
      metadata: { deletedAt: new Date().toISOString() }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
