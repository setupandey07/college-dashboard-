import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { AppNotification } from '../../types';
import { formatFirestoreDate, compareDatesDesc } from '../../lib/dateUtils';

export type { AppNotification };

const COLLECTION = 'notifications';

function parseNotificationDoc(docSnap: any): AppNotification {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    recipientUserId: data.recipientUserId || data.userId || '',
    userId: data.recipientUserId || data.userId || '',
    createdAt: formatFirestoreDate(data.createdAt, new Date().toISOString())
  } as AppNotification;
}

/**
 * Strict Private Notification Subscription
 * At the database query level, ONLY notifications targeted to recipientUserId are fetched.
 * No user can view or subscribe to another user's notifications.
 */
export function subscribeNotifications(
  userId: string,
  onData: (notifications: AppNotification[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const notifMap = new Map<string, AppNotification>();
  const unsubs: Unsubscribe[] = [];

  const notify = () => {
    const list = Array.from(notifMap.values());
    list.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt));
    onData(list);
  };

  // Primary: recipientUserId filter
  const qPrimary = query(collection(db, COLLECTION), where('recipientUserId', '==', userId));
  unsubs.push(
    onSnapshot(
      qPrimary,
      (snap) => {
        snap.docs.forEach(d => notifMap.set(d.id, parseNotificationDoc(d)));
        notify();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLECTION);
        } catch (err: any) {
          if (onError) onError(err);
        }
      }
    )
  );

  // Fallback / legacy alias: userId filter
  const qLegacy = query(collection(db, COLLECTION), where('userId', '==', userId));
  unsubs.push(
    onSnapshot(
      qLegacy,
      (snap) => {
        snap.docs.forEach(d => notifMap.set(d.id, parseNotificationDoc(d)));
        notify();
      },
      () => {}
    )
  );

  return () => {
    unsubs.forEach(u => {
      try { u(); } catch (_) {}
    });
  };
}

export async function createNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string; isRead?: boolean }
): Promise<void> {
  const recipient = notification.recipientUserId || notification.userId;
  if (!recipient) {
    console.warn('[createNotification] Skipped: recipientUserId is required for private notifications.');
    return;
  }

  const notifId = notification.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const path = `${COLLECTION}/${notifId}`;
  try {
    const docRef = doc(db, COLLECTION, notifId);
    await setDoc(docRef, sanitizeForFirestore({
      ...notification,
      id: notifId,
      recipientUserId: recipient,
      userId: recipient,
      isRead: false,
      createdAt: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  const path = `${COLLECTION}/${notificationId}`;
  try {
    const docRef = doc(db, COLLECTION, notificationId);
    await updateDoc(docRef, {
      isRead: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  try {
    const q = query(collection(db, COLLECTION), where('recipientUserId', '==', userId), where('isRead', '==', false));
    const snap = await getDocs(q);
    const updates = snap.docs.map(d => updateDoc(d.ref, { isRead: true, updatedAt: serverTimestamp() }));
    await Promise.all(updates);
  } catch (err) {
    console.warn('[markAllNotificationsAsRead] Notice:', err);
  }
}
