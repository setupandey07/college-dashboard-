/**
 * Academic Data Sorting Utilities
 *
 * Implements strict, natural numeric-aware sorting by official roll number / USN.
 * Prevents lexicographical sorting errors (e.g. orders 1, 2, 10, 11 correctly, not 1, 10, 11, 2).
 * Falls back to regId or name if roll number is missing.
 */

export function extractNumericParts(str: string): (number | string)[] {
  const parts: (number | string)[] = [];
  const regex = /(\d+|\D+)/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const part = match[0];
    const num = Number(part);
    if (!isNaN(num) && /^\d+$/.test(part)) {
      parts.push(num);
    } else {
      parts.push(part.toLowerCase());
    }
  }
  return parts;
}

/**
 * Natural numeric-aware roll number / USN comparison.
 */
export function compareRollNumbers(a?: string | null, b?: string | null): number {
  const cleanA = (a || '').trim();
  const cleanB = (b || '').trim();

  if (!cleanA && !cleanB) return 0;
  if (!cleanA) return 1;
  if (!cleanB) return -1;

  // Use localeCompare with numeric: true for high-performance natural sorting
  const result = cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
  if (result !== 0) return result;

  // Deep inspection fallback for complex alphanumeric IDs
  const partsA = extractNumericParts(cleanA);
  const partsB = extractNumericParts(cleanB);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const valA = partsA[i];
    const valB = partsB[i];
    if (valA === undefined) return -1;
    if (valB === undefined) return 1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      if (valA !== valB) return valA - valB;
    } else {
      const cmp = String(valA).localeCompare(String(valB));
      if (cmp !== 0) return cmp;
    }
  }

  return 0;
}

/**
 * Sorts student records by rollNumber / USN / regId.
 */
export function sortStudentsByRollNumber<
  T extends {
    rollNumber?: string | null;
    usn?: string | null;
    regId?: string | null;
    studentRoll?: string | null;
    registrationNumber?: string | null;
    name?: string | null;
    studentName?: string | null;
  }
>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const rollA = a.rollNumber || a.usn || a.studentRoll || a.registrationNumber || a.regId || '';
    const rollB = b.rollNumber || b.usn || b.studentRoll || b.registrationNumber || b.regId || '';

    const rollCmp = compareRollNumbers(rollA, rollB);
    if (rollCmp !== 0) return rollCmp;

    // Secondary fallback to student name
    const nameA = a.name || a.studentName || '';
    const nameB = b.name || b.studentName || '';
    return nameA.localeCompare(nameB);
  });
}
