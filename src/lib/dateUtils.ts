/**
 * Robust date formatting and sorting utilities for Firestore documents.
 * Safely handles Firestore Timestamps, ISO strings, Date objects, and epoch timestamps.
 */

export function formatFirestoreDate(val: unknown, fallback = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;

  // Firestore Timestamp with toDate()
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as any).toDate === 'function') {
    try {
      const d: Date = (val as any).toDate();
      return formatDateOnly(d);
    } catch {
      return fallback;
    }
  }

  // Deserialized timestamp or object with seconds
  if (typeof val === 'object' && val !== null && 'seconds' in val && typeof (val as any).seconds === 'number') {
    try {
      const d = new Date((val as any).seconds * 1000);
      return formatDateOnly(d);
    } catch {
      return fallback;
    }
  }

  // JS Date instance
  if (val instanceof Date) {
    return formatDateOnly(val);
  }

  // Number (epoch millis or seconds)
  if (typeof val === 'number') {
    try {
      const millis = val < 10000000000 ? val * 1000 : val;
      const d = new Date(millis);
      return formatDateOnly(d);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function formatDateOnly(d: Date): string {
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDateMillis(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') {
    return val < 10000000000 ? val * 1000 : val;
  }
  if (typeof val === 'object' && val !== null) {
    if ('toMillis' in val && typeof (val as any).toMillis === 'function') {
      return (val as any).toMillis();
    }
    if ('toDate' in val && typeof (val as any).toDate === 'function') {
      try {
        return (val as any).toDate().getTime();
      } catch {
        return 0;
      }
    }
    if ('seconds' in val && typeof (val as any).seconds === 'number') {
      return (val as any).seconds * 1000;
    }
  }
  if (val instanceof Date) {
    return val.getTime();
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function compareDatesDesc(a: unknown, b: unknown): number {
  return getDateMillis(b) - getDateMillis(a);
}

export function compareDatesAsc(a: unknown, b: unknown): number {
  return getDateMillis(a) - getDateMillis(b);
}
