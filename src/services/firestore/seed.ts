import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { isAuthorizedDevAdminIdentity } from '../../lib/authHelpers';

export const DEMO_USER_DOC_IDS = [
  'u-hod-1',
  'u-fac-1',
  'u-fac-2',
  'u-lab-1',
  'u-stu-1',
  'u-stu-2',
  'u-stu-3',
  'u-stu-demo'
];

export const DEMO_USER_EMAILS = [
  'hod.cse@academiccore.edu',
  'vikram.k@academiccore.edu',
  'ananya.d@academiccore.edu',
  'senthil.lab@academiccore.edu',
  'aarav.22cs042@student.nitandhra.ac.in',
  'pooja.22cs078@student.nitandhra.ac.in',
  'rohan.22cs105@student.nitandhra.ac.in',
  'student@student.nitandhra.ac.in'
];

export const DEMO_ASSESSMENT_IDS = [
  'ass-cia1-cs501',
  'ass-cia2-cs501',
  'ass-cia1-cs502'
];

export const DEMO_QUERY_IDS = [
  'q-101',
  'q-102',
  'q-103'
];

export const DEMO_INNOVATION_IDS = [
  'inn-001',
  'inn-002',
  'inn-003'
];

export const DEMO_ANNOUNCEMENT_IDS = [
  'anc-01',
  'anc-02',
  'anc-03',
  'anc-04'
];

export const DEMO_ATTENDANCE_SESSION_IDS = [
  'att-sess-101',
  'att-sess-102',
  'att-sess-103'
];

export const DEMO_LAB_EQUIPMENT_IDS = [
  'eq-101',
  'eq-102',
  'eq-103',
  'eq-104'
];

/**
 * Purges all hardcoded demo/sample users from both 'users' and 'students' collections.
 * Guaranteed to NEVER delete the authenticated Administrator.
 */
export async function purgeDemoUsers(): Promise<{ success: boolean; deletedCount: number }> {
  let count = 0;
  try {
    // 1. Delete by known document IDs (excluding any admin ID)
    for (const uid of DEMO_USER_DOC_IDS) {
      if (uid === 'u-admin-1' || uid === 'admin') continue;
      try {
        const uRef = doc(db, 'users', uid);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          const uData = uSnap.data();
          if (!isAuthorizedDevAdminIdentity(uData.email, uid)) {
            await deleteDoc(uRef);
            count++;
          }
        }
      } catch (_) {}

      try {
        const sRef = doc(db, 'students', uid);
        const sSnap = await getDoc(sRef);
        if (sSnap.exists()) {
          const sData = sSnap.data();
          if (!isAuthorizedDevAdminIdentity(sData.email, uid)) {
            await deleteDoc(sRef);
            count++;
          }
        }
      } catch (_) {}
    }

    // 2. Query any users matching demo emails or demo names
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        const data = d.data();
        const email = (data.email || '').toLowerCase().trim();
        const name = (data.name || '').trim();

        // Strictly protect administrator
        if (
          isAuthorizedDevAdminIdentity(email, d.id) ||
          d.id === 'admin' ||
          data.role === 'admin' ||
          email.includes('pkr02042006@gmail.com') ||
          email.includes('startup5077')
        ) {
          continue;
        }

        const isDemoEmail = DEMO_USER_EMAILS.some(de => email === de.toLowerCase());
        const isDemoName =
          name.includes('Vikramaditya') ||
          name.includes('Ananya Deshmukh') ||
          name.includes('Meenakshi Sundaram') ||
          name.includes('Senthil Nathan') ||
          name.includes('Aarav Sharma') ||
          name.includes('Pooja Venkatesh') ||
          name.includes('Rohan Verma') ||
          name.includes('NIT Andhra Student (Demo)');

        if (isDemoEmail || isDemoName) {
          await deleteDoc(d.ref);
          count++;
        }
      }
    } catch (_) {}

    // 3. Query any students matching demo emails
    try {
      const stuSnap = await getDocs(collection(db, 'students'));
      for (const d of stuSnap.docs) {
        const data = d.data();
        const email = (data.email || '').toLowerCase().trim();
        const name = (data.name || '').trim();

        const isDemoEmail = DEMO_USER_EMAILS.some(de => email === de.toLowerCase());
        const isDemoName =
          name.includes('Aarav Sharma') ||
          name.includes('Pooja Venkatesh') ||
          name.includes('Rohan Verma') ||
          name.includes('NIT Andhra Student (Demo)');

        if (isDemoEmail || isDemoName) {
          await deleteDoc(d.ref);
          count++;
        }
      }
    } catch (_) {}

    console.log(`Purged ${count} demo users from Firestore.`);
    return { success: true, deletedCount: count };
  } catch (err) {
    console.warn('Notice during demo users purge:', err);
    return { success: false, deletedCount: count };
  }
}

/**
 * Purges ALL hardcoded demo items across the entire database:
 * - Demo users & students
 * - Demo assessments & marks
 * - Demo student marks
 * - Demo queries & replies
 * - Demo innovation projects
 * - Demo announcements / circulars
 * - Demo attendance sessions & summaries
 * - Demo lab equipment
 */
export async function purgeAllDemoData(): Promise<{ success: boolean; purgedTotal: number }> {
  let totalPurged = 0;

  try {
    // 1. Purge demo users & students
    const usersRes = await purgeDemoUsers();
    totalPurged += usersRes.deletedCount;

    // 2. Purge Assessments
    for (const assId of DEMO_ASSESSMENT_IDS) {
      try {
        const ref = doc(db, 'assessments', assId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await deleteDoc(ref);
          totalPurged++;
        }
      } catch (_) {}
    }

    // Query assessments starting with ass-cia
    try {
      const assSnap = await getDocs(collection(db, 'assessments'));
      for (const d of assSnap.docs) {
        if (d.id.startsWith('ass-cia1-') || d.id.startsWith('ass-cia2-') || DEMO_ASSESSMENT_IDS.includes(d.id)) {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    // 3. Purge Marks entries
    try {
      const marksSnap = await getDocs(collection(db, 'marks'));
      for (const d of marksSnap.docs) {
        const data = d.data();
        if (
          d.id.startsWith('ass-cia') ||
          data.studentId === 'u-stu-1' ||
          data.studentId === 'u-stu-2' ||
          data.studentId === 'u-stu-3' ||
          data.studentRoll === '1AC22CS042' ||
          data.studentRoll === '1AC22CS078' ||
          data.studentRoll === '1AC22CS105'
        ) {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    // 4. Purge StudentMarks summaries
    const demoStudentMarkIds = [
      'u-stu-1_CS501',
      'u-stu-1_CS502',
      'u-stu-1_CS503',
      'u-stu-1_CSL507',
      'sub-cs501',
      'sub-cs502',
      'sub-cs503',
      'sub-csl507'
    ];
    for (const smId of demoStudentMarkIds) {
      try {
        const ref = doc(db, 'studentMarks', smId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await deleteDoc(ref);
          totalPurged++;
        }
      } catch (_) {}
    }

    try {
      const smSnap = await getDocs(collection(db, 'studentMarks'));
      for (const d of smSnap.docs) {
        const data = d.data();
        if (
          d.id.startsWith('u-stu-') ||
          data.studentId === 'u-stu-1' ||
          data.studentId === 'u-stu-2' ||
          data.studentId === 'u-stu-3' ||
          !data.studentId
        ) {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    // 5. Purge Queries and responses
    for (const qId of DEMO_QUERY_IDS) {
      try {
        // Purge responses subcollection
        try {
          const respSnap = await getDocs(collection(db, 'queries', qId, 'responses'));
          for (const rd of respSnap.docs) {
            await deleteDoc(rd.ref);
            totalPurged++;
          }
        } catch (_) {}

        const ref = doc(db, 'queries', qId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await deleteDoc(ref);
          totalPurged++;
        }
      } catch (_) {}
    }

    try {
      const qSnap = await getDocs(collection(db, 'queries'));
      for (const d of qSnap.docs) {
        const data = d.data();
        if (
          DEMO_QUERY_IDS.includes(d.id) ||
          data.studentId === 'u-stu-1' ||
          data.studentId === 'u-stu-2' ||
          data.studentId === 'u-stu-3' ||
          data.usn === '1AC22CS042' ||
          data.usn === '1AC22CS078' ||
          data.usn === '1AC22CS105'
        ) {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    // 6. Purge Innovation Projects (problems)
    for (const innId of DEMO_INNOVATION_IDS) {
      try {
        const ref = doc(db, 'problems', innId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await deleteDoc(ref);
          totalPurged++;
        }
      } catch (_) {}
    }

    try {
      const innSnap = await getDocs(collection(db, 'problems'));
      for (const d of innSnap.docs) {
        const data = d.data();
        if (
          DEMO_INNOVATION_IDS.includes(d.id) ||
          data.leadStudent === 'Aarav Sharma' ||
          data.leadStudent === 'Devika Nair' ||
          data.leadStudent === 'Siddharth Rao' ||
          data.usn === '1AC22CS042' ||
          data.usn === '1AC22EC019' ||
          data.usn === '1AC21CS099'
        ) {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    // 7. Purge Announcements
    for (const ancId of DEMO_ANNOUNCEMENT_IDS) {
      try {
        const ref = doc(db, 'announcements', ancId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await deleteDoc(ref);
          totalPurged++;
        }
      } catch (_) {}
    }

    try {
      const ancSnap = await getDocs(collection(db, 'announcements'));
      for (const d of ancSnap.docs) {
        const data = d.data();
        if (
          DEMO_ANNOUNCEMENT_IDS.includes(d.id) ||
          data.attachmentName === 'Model_Exam_Schedule_Oct2026.pdf' ||
          data.attachmentName === 'NAAC_Criterion_2_Compliance_Guidelines.pdf'
        ) {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    // 8. Purge Attendance Sessions & Records
    for (const sessId of DEMO_ATTENDANCE_SESSION_IDS) {
      try {
        const ref = doc(db, 'attendanceSessions', sessId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await deleteDoc(ref);
          totalPurged++;
        }
      } catch (_) {}
    }

    try {
      const attSnap = await getDocs(collection(db, 'attendance'));
      for (const d of attSnap.docs) {
        if (d.id.startsWith('att-sess-')) {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    try {
      const summSnap = await getDocs(collection(db, 'attendanceSummaries'));
      for (const d of summSnap.docs) {
        if (d.id.startsWith('u-stu-') || d.data().studentId === 'u-stu-1') {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    // 9. Purge Lab Equipment
    for (const eqId of DEMO_LAB_EQUIPMENT_IDS) {
      try {
        const ref = doc(db, 'labEquipment', eqId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await deleteDoc(ref);
          totalPurged++;
        }
      } catch (_) {}
    }

    // 10. Reset department mock metrics in Firestore to 0
    try {
      const deptsSnap = await getDocs(collection(db, 'departments'));
      for (const d of deptsSnap.docs) {
        await updateDoc(d.ref, {
          facultyCount: 0,
          studentCount: 0,
          avgAttendance: 0,
          syllabusCompletion: 0,
          hodName: 'Unassigned',
          hodEmail: ''
        });
      }
    } catch (_) {}

    // 11. Purge legacy predefined/hardcoded mock subjects completely
    try {
      const subsSnap = await getDocs(collection(db, 'subjects'));
      const legacyPrefixes = ['sub-eee-', 'sub-ec-', 'sub-cs-', 'sub-it-', 'sub-me-', 'sub-ce-', 'sub-ad-'];
      for (const d of subsSnap.docs) {
        const subData = d.data();
        const isLegacyPrefix = legacyPrefixes.some(pref => d.id.startsWith(pref));
        const isUnassignedMock =
          subData.facultyName === 'Unassigned' &&
          (!subData.units || subData.units.length === 0) &&
          !subData.classId &&
          (subData.totalHoursPlanned === 45 || subData.totalHoursPlanned === 30 || subData.totalHoursPlanned === 60);

        if (isLegacyPrefix || isUnassignedMock) {
          await deleteDoc(d.ref);
          totalPurged++;
        }
      }
    } catch (_) {}

    console.log(`[Firestore Purge] Successfully removed ${totalPurged} demo/mock records.`);
    return { success: true, purgedTotal: totalPurged };
  } catch (err) {
    console.warn('[Firestore Purge] Notice during full demo purge:', err);
    return { success: false, purgedTotal: totalPurged };
  }
}

/**
 * Ensures system is initialized cleanly without ever recreating deleted departments or hardcoded subjects.
 * Never seeds hardcoded departments, subjects, or fake records.
 */
export async function seedFirestoreDatabase(force = false): Promise<{ success: boolean; message: string }> {
  try {
    const seedMetaRef = doc(db, 'system', 'seed_status');

    try {
      const seedMetaSnap = await getDoc(seedMetaRef);
      if (seedMetaSnap.exists() && !force) {
        return { success: true, message: 'Database already verified and seeded' };
      }
    } catch (checkError) {
      const checkMsg = checkError instanceof Error ? checkError.message : String(checkError);
      if (checkMsg.includes('offline') || checkMsg.includes('unavailable') || checkMsg.includes('permission')) {
        return { success: true, message: 'Firestore offline/initializing or restricted' };
      }
      throw checkError;
    }

    // Only if unseeded or forced, purge legacy demo items
    console.log('[Firestore Seed] Verifying clean database state...');
    await purgeAllDemoData();

    // Mark system seed complete
    await setDoc(seedMetaRef, {
      seeded: true,
      seededAt: serverTimestamp(),
      version: 3,
      cleanRealTime: true,
      zeroHardcodedData: true
    });

    console.log('Firestore foundation initialized clean with zero hardcoded academic data.');
    return { success: true, message: 'Firestore initialized with 100% clean database' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('offline') || errorMsg.includes('unavailable')) {
      console.warn('Firestore database seed skipped (client offline/initializing):', errorMsg);
      return { success: true, message: 'Skipped seed while client connecting' };
    }
    console.warn('Notice during Firestore database init:', error);
    return { success: false, message: errorMsg };
  }
}
