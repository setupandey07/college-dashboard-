import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { DepartmentInfo } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';

const COLLECTION = 'departments';

export function subscribeDepartments(
  onData: (departments: DepartmentInfo[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const depts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DepartmentInfo[];
      onData(depts);
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

export async function getDepartments(): Promise<DepartmentInfo[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DepartmentInfo[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION);
    return [];
  }
}

export async function saveDepartment(dept: DepartmentInfo): Promise<void> {
  const path = `${COLLECTION}/${dept.id}`;
  try {
    const docRef = doc(db, COLLECTION, dept.id);
    const payload = sanitizeForFirestore({
      ...dept,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });

    await logAuditEvent({
      actorName: 'System / Admin',
      actorRole: 'admin',
      action: 'saveDepartment',
      entityType: 'department',
      entityId: dept.id,
      metadata: { code: dept.code, name: dept.name }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createDepartment(deptData: Omit<DepartmentInfo, 'id'> & { id?: string }): Promise<DepartmentInfo> {
  const id = deptData.id || `dept-${deptData.code.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
  const fullDept: DepartmentInfo = {
    id,
    code: deptData.code.toUpperCase().trim(),
    name: deptData.name.trim(),
    hodName: deptData.hodName.trim(),
    hodEmail: deptData.hodEmail.trim(),
    facultyCount: deptData.facultyCount ?? 0,
    studentCount: deptData.studentCount ?? 0,
    labsCount: deptData.labsCount ?? 0,
    avgAttendance: deptData.avgAttendance ?? 0,
    syllabusCompletion: deptData.syllabusCompletion ?? 0,
    establishedYear: deptData.establishedYear ?? new Date().getFullYear(),
    description: deptData.description || '',
    phone: deptData.phone || '',
    location: deptData.location || '',
    status: deptData.status || 'active'
  };

  const path = `${COLLECTION}/${id}`;
  try {
    const docRef = doc(db, COLLECTION, id);
    const payload = sanitizeForFirestore({
      ...fullDept,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload);

    await logAuditEvent({
      actorName: 'Admin',
      actorRole: 'admin',
      action: 'createDepartment',
      entityType: 'department',
      entityId: id,
      metadata: { code: fullDept.code, name: fullDept.name }
    });

    return fullDept;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateDepartment(
  deptId: string,
  data: Partial<DepartmentInfo>
): Promise<void> {
  const path = `${COLLECTION}/${deptId}`;
  try {
    const docRef = doc(db, COLLECTION, deptId);
    const payload = sanitizeForFirestore({
      ...data,
      updatedAt: serverTimestamp()
    });
    await updateDoc(docRef, payload);

    await logAuditEvent({
      actorName: 'Admin',
      actorRole: 'admin',
      action: 'updateDepartment',
      entityType: 'department',
      entityId: deptId,
      metadata: { updatedFields: Object.keys(data) }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDepartment(deptId: string): Promise<void> {
  const path = `${COLLECTION}/${deptId}`;
  try {
    const docRef = doc(db, COLLECTION, deptId);
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : null;
    const deptCode = (data?.code || '').toUpperCase().trim();
    const deptName = (data?.name || '').toLowerCase().trim();

    // 1. Delete the department document
    await deleteDoc(docRef);

    // 2. Cascade delete associated sections (classrooms) and timetables
    try {
      const secSnap = await getDocs(collection(db, 'sections'));
      for (const d of secSnap.docs) {
        const sec = d.data();
        const secDeptId = (sec.departmentId || '').trim();
        const secDeptCode = (sec.departmentCode || '').toUpperCase().trim();
        if (secDeptId === deptId || (deptCode && secDeptCode === deptCode)) {
          await deleteDoc(d.ref);
          try {
            await deleteDoc(doc(db, 'timetables', d.id));
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 3. Cascade delete associated subjects
    try {
      const subSnap = await getDocs(collection(db, 'subjects'));
      for (const d of subSnap.docs) {
        const sub = d.data();
        const subDeptCode = (sub.departmentCode || '').toUpperCase().trim();
        const subDeptName = (sub.department || '').toLowerCase().trim();
        if ((deptCode && subDeptCode === deptCode) || (deptName && subDeptName === deptName)) {
          await deleteDoc(d.ref);
        }
      }
    } catch (_) {}

    await logAuditEvent({
      actorName: 'Admin',
      actorRole: 'admin',
      action: 'deleteDepartment',
      entityType: 'department',
      entityId: deptId,
      metadata: { deletedAt: new Date().toISOString(), deptCode, cascaded: true }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateDepartmentMetrics(
  deptId: string,
  metrics: Partial<Pick<DepartmentInfo, 'avgAttendance' | 'syllabusCompletion' | 'facultyCount' | 'studentCount'>>
): Promise<void> {
  const path = `${COLLECTION}/${deptId}`;
  try {
    const docRef = doc(db, COLLECTION, deptId);
    await updateDoc(docRef, {
      ...metrics,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
