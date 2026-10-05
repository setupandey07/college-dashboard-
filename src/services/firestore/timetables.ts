import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';

export type TimetableDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export const TIMETABLE_DAYS: TimetableDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

export interface TimetableSlotConfig {
  id: string; // e.g. "p1", "p2", "break", "p5"
  period: number; // 1 to 7, or 0 for break/buffer
  label: string; // "Period 1", "Break", "Period 5"
  startTime: string; // "09:00"
  endTime: string; // "09:50"
  timeRange: string; // "9:00–9:50"
  isBreak?: boolean;
  isBuffer?: boolean;
}

export const DEFAULT_TIMETABLE_SLOTS: TimetableSlotConfig[] = [
  {
    id: 'p1',
    period: 1,
    label: 'Period 1',
    startTime: '09:00',
    endTime: '09:50',
    timeRange: '9:00 AM – 9:50 AM'
  },
  {
    id: 'p2',
    period: 2,
    label: 'Period 2',
    startTime: '10:00',
    endTime: '10:50',
    timeRange: '10:00 AM – 10:50 AM'
  },
  {
    id: 'p3',
    period: 3,
    label: 'Period 3',
    startTime: '11:00',
    endTime: '11:50',
    timeRange: '11:00 AM – 11:50 AM'
  },
  {
    id: 'p4',
    period: 4,
    label: 'Period 4',
    startTime: '12:00',
    endTime: '12:50',
    timeRange: '12:00 PM – 12:50 PM'
  },
  {
    id: 'lunch',
    period: 0,
    label: 'Lunch Break',
    startTime: '12:50',
    endTime: '14:00',
    timeRange: '12:50 PM – 2:00 PM',
    isBreak: true
  },
  {
    id: 'p5',
    period: 5,
    label: 'Period 5',
    startTime: '14:00',
    endTime: '14:50',
    timeRange: '2:00 PM – 2:50 PM'
  },
  {
    id: 'p6',
    period: 6,
    label: 'Period 6',
    startTime: '15:00',
    endTime: '15:50',
    timeRange: '3:00 PM – 3:50 PM'
  },
  {
    id: 'p7',
    period: 7,
    label: 'Period 7',
    startTime: '16:00',
    endTime: '16:50',
    timeRange: '4:00 PM – 4:50 PM'
  }
];

export interface TimetableCell {
  subjectId: string;
  subjectCode: string; // e.g. "EE301" - displayed in cell
  subjectName: string; // e.g. "DC Machines & Transformers"
  facultyId?: string;
  facultyName?: string;
  roomNumber?: string;
  room?: string;
  type?: 'theory' | 'lab' | 'integrated';
  credits?: number;
  // Lab 3-slot consecutive reservation metadata
  isLabSession?: boolean;
  labGroupId?: string; // unique group ID linking all 3 consecutive slots
  labSlotIndex?: number; // 0 (start), 1 (middle), 2 (end)
  labDurationSlots?: number; // 3
}

export type TimetableSchedule = {
  [day in TimetableDay]?: {
    [slotId: string]: TimetableCell | null;
  };
};

export interface ClassTimetable {
  id: string; // sectionId
  sectionId: string;
  departmentCode: string;
  departmentName?: string;
  academicYear: string;
  sectionName: string;
  slotsConfig: TimetableSlotConfig[];
  schedule: TimetableSchedule;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION = 'timetables';

export function subscribeAllTimetables(
  onData: (timetables: ClassTimetable[]) => void,
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
          sectionId: data.sectionId || doc.id,
          departmentCode: data.departmentCode || '',
          departmentName: data.departmentName || '',
          academicYear: data.academicYear || '',
          sectionName: data.sectionName || '',
          slotsConfig: data.slotsConfig && data.slotsConfig.length > 0 ? data.slotsConfig : DEFAULT_TIMETABLE_SLOTS,
          schedule: data.schedule || {}
        } as ClassTimetable;
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

export function subscribeTimetable(
  sectionId: string,
  onData: (timetable: ClassTimetable | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, COLLECTION, sectionId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onData({
          id: snapshot.id,
          sectionId,
          departmentCode: data.departmentCode || '',
          departmentName: data.departmentName || '',
          academicYear: data.academicYear || '',
          sectionName: data.sectionName || '',
          slotsConfig: data.slotsConfig && data.slotsConfig.length > 0 ? data.slotsConfig : DEFAULT_TIMETABLE_SLOTS,
          schedule: data.schedule || {}
        } as ClassTimetable);
      } else {
        // Return default empty initialized structure for this section
        onData(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${sectionId}`);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

export async function getTimetable(sectionId: string): Promise<ClassTimetable | null> {
  try {
    const docRef = doc(db, COLLECTION, sectionId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      id: snapshot.id,
      sectionId,
      departmentCode: data.departmentCode || '',
      departmentName: data.departmentName || '',
      academicYear: data.academicYear || '',
      sectionName: data.sectionName || '',
      slotsConfig: data.slotsConfig && data.slotsConfig.length > 0 ? data.slotsConfig : DEFAULT_TIMETABLE_SLOTS,
      schedule: data.schedule || {}
    } as ClassTimetable;
  } catch (error) {
    console.warn('[getTimetable] fallback to null:', error);
    return null;
  }
}

export async function saveTimetable(timetable: ClassTimetable): Promise<void> {
  const path = `${COLLECTION}/${timetable.sectionId}`;
  try {
    const docRef = doc(db, COLLECTION, timetable.sectionId);
    const payload = sanitizeForFirestore({
      ...timetable,
      slotsConfig: timetable.slotsConfig || DEFAULT_TIMETABLE_SLOTS,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });

    await logAuditEvent({
      actorName: 'Admin / HOD',
      actorRole: 'admin',
      action: 'updateSection',
      entityType: 'section',
      entityId: timetable.sectionId,
      metadata: {
        departmentCode: timetable.departmentCode,
        academicYear: timetable.academicYear,
        sectionName: timetable.sectionName,
        action: 'timetable_saved'
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export const LAB_CONSECUTIVE_SLOT_MAP: Record<string, string[]> = {
  p1: ['p1', 'p2', 'p3'], // 9:00 AM – 11:50 AM (Morning Block A)
  p2: ['p2', 'p3', 'p4'], // 10:00 AM – 12:50 PM (Morning Block B)
  p5: ['p5', 'p6', 'p7']  // 2:00 PM – 4:50 PM (Afternoon Block)
};

export async function updateTimetableSlot(
  sectionId: string,
  departmentCode: string,
  academicYear: string,
  sectionName: string,
  day: TimetableDay,
  slotId: string,
  cell: TimetableCell | null
): Promise<void> {
  const path = `${COLLECTION}/${sectionId}`;
  try {
    const docRef = doc(db, COLLECTION, sectionId);
    const snapshot = await getDoc(docRef);

    let schedule: TimetableSchedule = {};
    let slotsConfig = DEFAULT_TIMETABLE_SLOTS;

    if (snapshot.exists()) {
      const data = snapshot.data();
      schedule = data.schedule || {};
      if (data.slotsConfig && data.slotsConfig.length > 0) {
        slotsConfig = data.slotsConfig;
      }
    }

    if (!schedule[day]) {
      schedule[day] = {};
    }

    if (cell) {
      schedule[day]![slotId] = cell;
    } else {
      // Check if slot being cleared is part of a 3-slot Lab group
      const existingCell = schedule[day]?.[slotId];
      if (existingCell?.labGroupId) {
        const gid = existingCell.labGroupId;
        // Release all consecutive slots of this lab together
        for (const sid of Object.keys(schedule[day]!)) {
          if (schedule[day]![sid]?.labGroupId === gid) {
            delete schedule[day]![sid];
          }
        }
      } else {
        delete schedule[day]![slotId];
      }
    }

    const payload = sanitizeForFirestore({
      sectionId,
      departmentCode,
      academicYear,
      sectionName,
      slotsConfig,
      schedule,
      updatedAt: serverTimestamp()
    });

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Assigns a 3-slot consecutive Lab / Practical session across the schedule atomically
 */
export async function assignLabTimetableSlots(
  sectionId: string,
  departmentCode: string,
  academicYear: string,
  sectionName: string,
  day: TimetableDay,
  startSlotId: string,
  cell: TimetableCell
): Promise<{ success: boolean; affectedSlotIds: string[] }> {
  const consecutiveSlots = LAB_CONSECUTIVE_SLOT_MAP[startSlotId];
  if (!consecutiveSlots) {
    throw new Error(
      `A 3-slot Lab must begin at Period 1 (9:00 AM), Period 2 (10:00 AM), or Period 5 (2:00 PM) to occupy 3 consecutive periods.`
    );
  }

  const path = `${COLLECTION}/${sectionId}`;
  try {
    const docRef = doc(db, COLLECTION, sectionId);
    const snapshot = await getDoc(docRef);

    let schedule: TimetableSchedule = {};
    let slotsConfig = DEFAULT_TIMETABLE_SLOTS;

    if (snapshot.exists()) {
      const data = snapshot.data();
      schedule = data.schedule || {};
      if (data.slotsConfig && data.slotsConfig.length > 0) {
        slotsConfig = data.slotsConfig;
      }
    }

    if (!schedule[day]) {
      schedule[day] = {};
    }

    // Check for conflicts in any of the 3 slots
    for (const sid of consecutiveSlots) {
      const existing = schedule[day]?.[sid];
      if (existing && existing.subjectId !== cell.subjectId) {
        throw new Error(
          `Slot ${sid.toUpperCase()} on ${day} is already occupied by ${existing.subjectCode} (${existing.subjectName}). Clear it first.`
        );
      }
    }

    // Generate unique group ID linking the 3 consecutive slots
    const labGroupId = `lab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Populate all 3 slots
    consecutiveSlots.forEach((sid, idx) => {
      schedule[day]![sid] = {
        ...cell,
        type: 'lab',
        isLabSession: true,
        labGroupId,
        labSlotIndex: idx,
        labDurationSlots: 3
      };
    });

    const payload = sanitizeForFirestore({
      sectionId,
      departmentCode,
      academicYear,
      sectionName,
      slotsConfig,
      schedule,
      updatedAt: serverTimestamp()
    });

    await setDoc(docRef, payload, { merge: true });
    return { success: true, affectedSlotIds: consecutiveSlots };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
