import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { UserRole } from '../../types';

export interface AuditLogEntry {
  id?: string;
  actorUid?: string;
  actorName: string;
  actorRole: UserRole | string;
  action: string;
  entityType: 'attendance' | 'marks' | 'syllabus' | 'query' | 'problem' | 'announcement' | 'equipment' | 'user' | 'department' | 'section';
  entityId: string;
  timestamp?: any;
  metadata?: Record<string, any>;
}

const COLLECTION = 'auditLogs';

export async function logAuditEvent(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<void> {
  const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const path = `${COLLECTION}/${logId}`;
  try {
    const docRef = doc(db, COLLECTION, logId);
    await setDoc(docRef, {
      ...entry,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Non-blocking for audit failures in dev, but formatted properly
    console.warn(`[AuditLog Error for ${path}]:`, error);
  }
}

export async function getRecentAuditLogs(count = 20): Promise<AuditLogEntry[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('timestamp', 'desc'), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AuditLogEntry[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}
