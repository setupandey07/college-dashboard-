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
  where,
  orderBy
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errors';

export interface AppNotification {
  id: string;
  userId?: string;
  targetRole?: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'warning' | 'success';
  isRead: boolean;
  linkTab?: string;
  createdAt?: any;
}

const COLLECTION = 'notifications';

export function subscribeNotifications(
  userId: string,
  onData: (notifications: AppNotification[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      // Filter for user or global notifications
      const userList = list.filter(n => !n.userId || n.userId === userId || n.userId === 'all');
      onData(userList);
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

export async function createNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string }
): Promise<void> {
  const notifId = notification.id || `notif-${Date.now()}`;
  const path = `${COLLECTION}/${notifId}`;
  try {
    const docRef = doc(db, COLLECTION, notifId);
    await setDoc(docRef, sanitizeForFirestore({
      ...notification,
      id: notifId,
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
      isRead: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
