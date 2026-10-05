import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { UserProfile } from '../../types';

export interface StudentRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  rollNumber: string;
  registrationNumber: string;
  departmentId: string;
  departmentName: string;
  year: number;
  section: string;
  semester: number;
  admissionYear: number;
  status: 'active' | 'inactive';
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION = 'students';

export function subscribeStudents(
  onData: (students: StudentRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudentRecord[];
      onData(records);
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

export async function getStudentByExactEmail(email: string): Promise<StudentRecord | null> {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail) return null;
  try {
    const q = query(collection(db, COLLECTION), where('email', '==', normEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as StudentRecord;
    }
    // Also check case-insensitive match
    const all = await getStudents();
    const found = all.find(s => (s.email || '').trim().toLowerCase() === normEmail);
    return found || null;
  } catch (error) {
    console.warn(`[getStudentByExactEmail] Notice for ${normEmail}:`, error);
    return null;
  }
}

export async function getStudents(): Promise<StudentRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StudentRecord[];
  } catch (error) {
    console.warn('[getStudents] fallback to empty:', error);
    return [];
  }
}

export async function saveStudent(student: StudentRecord): Promise<void> {
  const path = `${COLLECTION}/${student.id}`;
  try {
    const docRef = doc(db, COLLECTION, student.id);
    const payload = sanitizeForFirestore({
      ...student,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createOrUpdateStudentProfile(
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string,
  isProfileComplete = false
): Promise<{ user: UserProfile; student: StudentRecord }> {
  const normEmail = (email || '').trim().toLowerCase();
  const emailPrefix = normEmail.split('@')[0] || 'student';
  const rollNumber = emailPrefix.toUpperCase();

  const studentName = displayName && displayName.trim() !== ''
    ? displayName.trim()
    : `Student ${rollNumber}`;

  // Explicitly initialize academic placement as Unassigned for new users
  // User must select Department, Academic Year, Semester, and Section during setup
  const deptName = 'Unassigned Department';
  const deptCode = 'UNASSIGNED';
  const deptId = 'unassigned';

  const studentRecord: StudentRecord = {
    id: uid || `stu-${emailPrefix}`,
    userId: uid || `stu-${emailPrefix}`,
    name: studentName,
    email: normEmail,
    rollNumber,
    registrationNumber: rollNumber,
    departmentId: deptId,
    departmentName: deptName,
    year: 0,
    section: '',
    semester: 0,
    admissionYear: new Date().getFullYear(),
    status: 'active'
  };

  const userProfile: UserProfile = {
    id: uid || `stu-${emailPrefix}`,
    name: studentName,
    email: normEmail,
    role: 'student',
    department: deptName,
    departmentCode: deptCode,
    phone: '',
    regId: rollNumber,
    designation: 'Undergraduate Student (Unassigned)',
    semester: 0,
    section: '',
    joiningYear: String(new Date().getFullYear()),
    status: 'active',
    isProfileComplete: false,
    avatar:
      photoURL ||
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  };

  try {
    const studentDocRef = doc(db, COLLECTION, studentRecord.id);
    await setDoc(studentDocRef, sanitizeForFirestore({
      ...studentRecord,
      updatedAt: serverTimestamp()
    }), { merge: true });

    const userDocRef = doc(db, 'users', userProfile.id);
    await setDoc(userDocRef, sanitizeForFirestore({
      ...userProfile,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch (err) {
    console.warn('[createOrUpdateStudentProfile] Firestore sync notice:', err);
  }

  return { user: userProfile, student: studentRecord };
}

export async function deleteStudent(studentId: string): Promise<void> {
  const path = `${COLLECTION}/${studentId}`;
  try {
    const docRef = doc(db, COLLECTION, studentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateStudentProfile(studentId: string, partial: Partial<StudentRecord> & Record<string, any>): Promise<void> {
  const path = `${COLLECTION}/${studentId}`;
  try {
    const docRef = doc(db, COLLECTION, studentId);
    const payload = sanitizeForFirestore({
      ...partial,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

