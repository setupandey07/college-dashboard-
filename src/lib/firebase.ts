import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, limit, getDocsFromServer } from 'firebase/firestore';
import configFile from '../../firebase-applet-config.json';

// Authoritative configuration from firebase-applet-config.json provisioned and verified for this applet
export const firebaseConfig = {
  apiKey: configFile.apiKey,
  authDomain: configFile.authDomain,
  projectId: configFile.projectId,
  storageBucket: configFile.storageBucket,
  messagingSenderId: configFile.messagingSenderId,
  appId: configFile.appId,
  firestoreDatabaseId: configFile.firestoreDatabaseId || '(default)'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Pass databaseId for non-default or custom databases
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export async function checkFirestoreAccess(): Promise<{ ok: boolean; permissionDenied: boolean }> {
  try {
    // 1. Mandatory connection test primitive as per Firebase Skill specification
    try {
      await getDocFromServer(doc(db, 'system', 'connection'));
    } catch (testErr: any) {
      const errMsg = (testErr?.message || '').toLowerCase();
      if (testErr?.code === 'permission-denied' || errMsg.includes('permission') || errMsg.includes('insufficient')) {
        return { ok: false, permissionDenied: true };
      }
    }

    // 2. Authoritative list access check for collections
    const sampleQuery = query(collection(db, 'departments'), limit(1));
    await getDocsFromServer(sampleQuery);
    return { ok: true, permissionDenied: false };
  } catch (error: any) {
    const errMsg = (error?.message || '').toLowerCase();
    const isPermissionDenied =
      error?.code === 'permission-denied' ||
      errMsg.includes('permission') ||
      errMsg.includes('insufficient');
    return { ok: !isPermissionDenied, permissionDenied: isPermissionDenied };
  }
}

export async function testConnection(): Promise<boolean> {
  const result = await checkFirestoreAccess();
  return result.ok;
}

export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj as T;
  if (typeof obj !== 'object') return obj;

  if (
    obj instanceof Date ||
    (typeof (obj as any).isEqual === 'function') ||
    (obj as any)._methodName ||
    (obj as any).type === 'serverTimestamp'
  ) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned as T;
}

export default app;
