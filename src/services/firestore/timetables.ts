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
    timeRange: '9:00–9:50'
  },
  {
    id: 'p2',
    period: 2,
    label: 'Period 2',
    startTime: '09:50',
    endTime: '10:40',
    timeRange: '9:50–10:40'
  },
  {
    id: 'p3',
    period: 3,
    label: 'Period 3',
    startTime: '10:40',
    endTime: '11:30',
    timeRange: '10:40–11:30'
  },
  {
    id: 'p4',
    period: 4,
    label: 'Period 4',
    startTime: '11:30',
    endTime: '12:20',
    timeRange: '11:30–12:20'
  },
  {
    id: 'break',
    period: 0,
    label: 'Institutional Break',
    startTime: '12:20',
    endTime: '13:00',
    timeRange: '12:20–1:00',
    isBreak: true
  },
  {
    id: 'p5',
    period: 5,
    label: 'Period 5',
    startTime: '14:00',
    endTime: '14:50',
    timeRange: '2:00–2:50'
  },
  {
    id: 'p6',
    period: 6,
    label: 'Period 6',
    startTime: '14:50',
    endTime: '15:40',
    timeRange: '2:50–3:40'
  },
  {
    id: 'p7',
    period: 7,
    label: 'Period 7',
    startTime: '15:40',
    endTime: '16:30',
    timeRange: '3:40–4:30'
  },
  {
    id: 'buffer',
    period: 0,
    label: 'Institutional Buffer',
    startTime: '16:30',
    endTime: '17:00',
    timeRange: '4:30–5:00',
    isBuffer: true
  }
];

export interface TimetableCell {
  subjectId: string;
  subjectCode: string; // e.g. "EE301" - displayed in cell
  subjectName: string; // e.g. "DC Machines & Transformers"
  facultyId?: string;
  facultyName?: string;
  roomNumber?: string;
  type?: 'theory' | 'lab' | 'integrated';
  credits?: number;
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
      delete schedule[day]![slotId];
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
