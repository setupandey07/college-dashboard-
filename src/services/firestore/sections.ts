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
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';

export interface AcademicSection {
  id: string; // e.g. "sec-eee-2yr-b"
  departmentId: string; // e.g. "dept-eee"
  departmentCode: string; // "EEE"
  departmentName?: string;
  academicYear: string; // "1st Year", "2nd Year", "3rd Year", "4th Year"
  yearNumber: number; // 1, 2, 3, 4
  semester?: number; // optional legacy field
  sectionName: string; // "Section A", "Section B"
  capacity?: number;
  roomNumber?: string;
  classTeacherId?: string;
  classTeacherName?: string;
  status: 'active' | 'inactive';
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION = 'sections';

/**
 * Deduplicates and normalizes academic section records.
 * Identifies duplicate records for the same department + academicYear + sectionName.
 * Filters out inactive records.
 */
export function deduplicateAndSanitizeSections(sections: AcademicSection[]): AcademicSection[] {
  const map = new Map<string, AcademicSection>();
  for (const s of sections) {
    if (!s || s.status === 'inactive') continue;
    const code = (s.departmentCode || '').trim().toUpperCase();
    const year = (s.academicYear || '').trim().toLowerCase();
    const sec = (s.sectionName || '').trim().toLowerCase();
    if (!code || !year || !sec) continue;
    const key = `${code}_${year}_${sec}`;
    if (!map.has(key)) {
      map.set(key, s);
    } else {
      const existing = map.get(key)!;
      // Prefer record with classTeacherId or roomNumber or more complete data
      if ((s.classTeacherId || s.roomNumber) && (!existing.classTeacherId && !existing.roomNumber)) {
        map.set(key, s);
      }
    }
  }
  return Array.from(map.values());
}

export function subscribeSections(
  onData: (sections: AcademicSection[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const rawList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AcademicSection[];

      // Detect and clean up any duplicate documents from Firestore if present
      const seenKeys = new Map<string, string>(); // key -> docId to keep
      const duplicateDocIdsToDelete: string[] = [];

      for (const s of rawList) {
        if (!s || s.status === 'inactive') continue;
        const code = (s.departmentCode || '').trim().toUpperCase();
        const year = (s.academicYear || '').trim().toLowerCase();
        const sec = (s.sectionName || '').trim().toLowerCase();
        if (!code || !year || !sec) continue;
        const key = `${code}_${year}_${sec}`;
        if (!seenKeys.has(key)) {
          seenKeys.set(key, s.id);
        } else {
          // Extra duplicate record found in Firestore!
          duplicateDocIdsToDelete.push(s.id);
        }
      }

      // Asynchronously delete duplicate documents from Firestore
      if (duplicateDocIdsToDelete.length > 0) {
        console.warn(`[subscribeSections] Detected ${duplicateDocIdsToDelete.length} duplicate section documents in database. Purging duplicates...`, duplicateDocIdsToDelete);
        for (const dupId of duplicateDocIdsToDelete) {
          deleteDoc(doc(db, COLLECTION, dupId)).catch(err => {
            console.warn(`[subscribeSections] Failed to delete duplicate section ${dupId}:`, err);
          });
        }
      }

      const cleanList = deduplicateAndSanitizeSections(rawList);
      onData(cleanList);
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

export async function getSections(): Promise<AcademicSection[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    const rawList = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as AcademicSection[];
    return deduplicateAndSanitizeSections(rawList);
  } catch (error) {
    console.warn('[getSections] fallback to empty:', error);
    return [];
  }
}

export async function createSection(data: Omit<AcademicSection, 'id'> & { id?: string }): Promise<AcademicSection> {
  const cleanCode = (data.departmentCode || 'DEPT').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanSec = (data.sectionName || 'a').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanYear = (data.academicYear || '1yr').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Deterministic canonical ID prevents duplicate records for the same class/section
  const canonicalId = data.id || `sec-${cleanCode}-${cleanYear}-${cleanSec}`;

  const fullSection: AcademicSection = {
    ...data,
    id: canonicalId,
    departmentCode: data.departmentCode.toUpperCase().trim(),
    sectionName: data.sectionName.trim(),
    status: data.status || 'active'
  };

  const path = `${COLLECTION}/${canonicalId}`;
  try {
    const docRef = doc(db, COLLECTION, canonicalId);
    const payload = sanitizeForFirestore({
      ...fullSection,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload);

    await logAuditEvent({
      actorName: 'Admin / System',
      actorRole: 'admin',
      action: 'createSection',
      entityType: 'section',
      entityId: canonicalId,
      metadata: { departmentCode: fullSection.departmentCode, academicYear: fullSection.academicYear, section: fullSection.sectionName }
    });

    return fullSection;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateSection(id: string, data: Partial<AcademicSection>): Promise<void> {
  const path = `${COLLECTION}/${id}`;
  try {
    const docRef = doc(db, COLLECTION, id);
    const payload = sanitizeForFirestore({
      ...data,
      updatedAt: serverTimestamp()
    });
    await updateDoc(docRef, payload);

    await logAuditEvent({
      actorName: 'Admin / HOD',
      actorRole: 'admin',
      action: 'updateSection',
      entityType: 'section',
      entityId: id,
      metadata: { updatedFields: Object.keys(data) }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSection(id: string): Promise<void> {
  const path = `${COLLECTION}/${id}`;
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName: 'Admin',
      actorRole: 'admin',
      action: 'deleteSection',
      entityType: 'section',
      entityId: id,
      metadata: { deletedAt: new Date().toISOString() }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
