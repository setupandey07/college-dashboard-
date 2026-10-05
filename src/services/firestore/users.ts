import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';

const COLLECTION = 'users';

export function subscribeUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];
      onData(usersList);
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

export async function getUserById(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, COLLECTION, userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as UserProfile;
  } catch (error) {
    console.warn(`[getUserById] Notice for ${userId}:`, error);
    return null;
  }
}

export async function getUserByExactEmail(email: string): Promise<UserProfile | null> {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail) return null;
  try {
    const q = query(collection(db, COLLECTION), where('email', '==', normEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as UserProfile;
    }
    // Check all documents for case-insensitive match
    const allUsers = await getUsers();
    const found = allUsers.find(u => (u.email || '').trim().toLowerCase() === normEmail);
    return found || null;
  } catch (error) {
    console.warn(`[getUserByExactEmail] Notice for ${normEmail}:`, error);
    return null;
  }
}

export async function createOrUpdateAdminProfile(
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string
): Promise<UserProfile> {
  const normEmail = (email || '').trim().toLowerCase();
  const existingUser = await getUserById(uid) || await getUserByExactEmail(normEmail);

  // If existing user has the old dummy name "Dr. Rajeshwar Rao (startup5077)", discard it
  const isOldDummy = existingUser?.name?.includes('Rajeshwar') || existingUser?.name?.includes('startup5077');
  const cleanName = displayName && displayName.trim() !== ''
    ? displayName.trim()
    : (!isOldDummy && existingUser?.name ? existingUser.name : 'Administrator');

  const adminProfile: UserProfile = {
    id: uid,
    name: cleanName,
    email: normEmail || 'admin@academiccore.edu',
    role: 'admin',
    department: 'Dean & Academic Administration',
    departmentCode: 'ADMIN',
    avatar: photoURL || existingUser?.avatar || '',
    phone: existingUser?.phone || '+91 98450 11223',
    regId: existingUser?.regId || 'EMP-ADM-5077',
    designation: existingUser?.designation || 'Principal & Chief Academic Officer',
    joiningYear: existingUser?.joiningYear || '2024',
    status: 'active'
  };

  try {
    const docRef = doc(db, COLLECTION, uid);
    const payload = sanitizeForFirestore({
      ...adminProfile,
      uid,
      role: 'admin',
      status: 'active',
      profileComplete: true,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (e) {
    console.warn('[createOrUpdateAdminProfile] Sync notice:', e);
  }

  return adminProfile;
}

export async function getUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserProfile[];
  } catch (error) {
    console.warn('[getUsers] Database access notice:', error);
    return [];
  }
}

export async function saveUser(user: UserProfile): Promise<void> {
  const path = `${COLLECTION}/${user.id}`;
  try {
    const docRef = doc(db, COLLECTION, user.id);
    const payload = sanitizeForFirestore({
      ...user,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });

    await logAuditEvent({
      actorName: 'System / Admin',
      actorRole: 'admin',
      action: 'saveUser',
      entityType: 'user',
      entityId: user.id,
      metadata: { role: user.role, email: user.email }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(userId: string, partial: Partial<UserProfile>): Promise<void> {
  const path = `${COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, COLLECTION, userId);
    const payload = sanitizeForFirestore({
      ...partial,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  // Institutional Admin Protection: Prevent deletion of Admin accounts at application logic layer
  if (userId === 'u-admin-1') {
    throw new Error('CRITICAL SECURITY VIOLATION: Primary institutional Administrator (u-admin-1) is protected and cannot be deleted.');
  }

  const existing = await getUserById(userId);
  if (existing) {
    if (existing.role === 'admin' || existing.email?.toLowerCase().includes('admin@')) {
      throw new Error('CRITICAL SECURITY VIOLATION: Administrator accounts are strictly protected from deletion.');
    }
  }

  const path = `${COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, COLLECTION, userId);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName: 'System / Admin',
      actorRole: 'admin',
      action: 'deleteUser',
      entityType: 'user',
      entityId: userId,
      metadata: { deletedAt: new Date().toISOString() }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

