import {
  collection,
  doc,
  getDocs,
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
import { AcademicQuery, QueryReply, UserProfile, UserRole } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';
import { formatFirestoreDate, compareDatesDesc } from '../../lib/dateUtils';
import { filterQueriesForUser } from '../../lib/queryPrivacy';

const COLLECTION = 'queries';

function parseQueryDoc(docSnap: any): AcademicQuery {
  const data = docSnap.data();
  const createdByUserId = data.createdByUserId || data.createdBy || data.studentId || '';
  const recipientUserId = data.recipientUserId || data.recipientId || '';
  return {
    id: docSnap.id,
    ...data,
    createdByUserId,
    createdBy: createdByUserId,
    studentId: createdByUserId,
    recipientUserId,
    recipientId: recipientUserId,
    departmentId: data.departmentId || data.recipientDepartment || data.department || '',
    message: data.message || data.description || '',
    description: data.description || data.message || '',
    createdAt: formatFirestoreDate(data.createdAt, new Date().toISOString().replace('T', ' ').slice(0, 16)),
    replies: Array.isArray(data.replies)
      ? data.replies.map((r: any) => ({
          ...r,
          authorName: r.authorName || r.senderName || '',
          authorRole: r.authorRole || r.senderRole || 'student',
          senderName: r.senderName || r.authorName || '',
          senderRole: r.senderRole || r.authorRole || 'student',
          timestamp: formatFirestoreDate(r.timestamp, typeof r.timestamp === 'string' ? r.timestamp : '')
        }))
      : []
  } as AcademicQuery;
}

/**
 * Real-time User-Scoped Query Subscription
 * Enforces ownership and recipient data isolation at the database query level
 */
export function subscribeQueries(
  user: UserProfile | null,
  role: UserRole | null,
  onData: (queries: AcademicQuery[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!user || !role) {
    onData([]);
    return () => {};
  }

  const userId = user.id;
  const userDeptCode = (user.departmentCode || '').trim().toUpperCase();

  // 1. Admin Oversight: Full Institutional Visibility (or Admin simulating any role view)
  if (user.role === 'admin' || role === 'admin') {
    const colRef = collection(db, COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map(parseQueryDoc);
        list.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt));
        const filtered = filterQueriesForUser(list, user, role);
        onData(filtered);
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

  // 2. Student Role: Database-Level Isolation
  // Only queries created by this student are requested from Firestore
  if (role === 'student') {
    const myQueriesMap = new Map<string, AcademicQuery>();
    const unsubs: Unsubscribe[] = [];

    const notify = () => {
      const all = Array.from(myQueriesMap.values());
      all.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt));
      const filtered = filterQueriesForUser(all, user, 'student');
      onData(filtered);
    };

    // Query by createdByUserId
    const qCreatedUser = query(collection(db, COLLECTION), where('createdByUserId', '==', userId));
    unsubs.push(
      onSnapshot(
        qCreatedUser,
        (snap) => {
          snap.docs.forEach(d => myQueriesMap.set(d.id, parseQueryDoc(d)));
          notify();
        },
        () => {}
      )
    );

    // Query by createdBy (primary owner UID)
    const qCreated = query(collection(db, COLLECTION), where('createdBy', '==', userId));
    unsubs.push(
      onSnapshot(
        qCreated,
        (snap) => {
          snap.docs.forEach(d => myQueriesMap.set(d.id, parseQueryDoc(d)));
          notify();
        },
        () => {}
      )
    );

    // Also query by studentId for backward compatibility
    if (user.regId && user.regId !== userId) {
      const qUsn = query(collection(db, COLLECTION), where('studentId', '==', userId));
      unsubs.push(
        onSnapshot(
          qUsn,
          (snap) => {
            snap.docs.forEach(d => myQueriesMap.set(d.id, parseQueryDoc(d)));
            notify();
          },
          () => {}
        )
      );
    }

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch (_) {}
      });
    };
  }

  // 3. Faculty / HOD / Lab Assistant Role: Targeted Queries
  const recordsMap = new Map<string, AcademicQuery>();
  const unsubs: Unsubscribe[] = [];

  const notify = () => {
    const all = Array.from(recordsMap.values());
    all.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt));
    const filtered = filterQueriesForUser(all, user, role);
    onData(filtered);
  };

  // Queries created by this staff user
  const qCreated = query(collection(db, COLLECTION), where('createdBy', '==', userId));
  unsubs.push(
    onSnapshot(
      qCreated,
      (snap) => {
        snap.docs.forEach(d => recordsMap.set(d.id, parseQueryDoc(d)));
        notify();
      },
      () => {}
    )
  );

  // Queries directly addressed to this user (recipientUserId & recipientId)
  const qRecipientUser = query(collection(db, COLLECTION), where('recipientUserId', '==', userId));
  unsubs.push(
    onSnapshot(
      qRecipientUser,
      (snap) => {
        snap.docs.forEach(d => recordsMap.set(d.id, parseQueryDoc(d)));
        notify();
      },
      () => {}
    )
  );

  const qRecipient = query(collection(db, COLLECTION), where('recipientId', '==', userId));
  unsubs.push(
    onSnapshot(
      qRecipient,
      (snap) => {
        snap.docs.forEach(d => recordsMap.set(d.id, parseQueryDoc(d)));
        notify();
      },
      () => {}
    )
  );

  // ONLY HOD queries general department escalations; general faculty CANNOT see other faculty's queries!
  if (role === 'hod' && userDeptCode && userDeptCode !== 'UNASSIGNED') {
    const qDept = query(collection(db, COLLECTION), where('recipientDepartment', '==', userDeptCode));
    unsubs.push(
      onSnapshot(
        qDept,
        (snap) => {
          snap.docs.forEach(d => recordsMap.set(d.id, parseQueryDoc(d)));
          notify();
        },
        () => {}
      )
    );
  }

  // Lab assistant category subscription
  if (role === 'lab_assistant') {
    const qLab = query(collection(db, COLLECTION), where('category', '==', 'lab'));
    unsubs.push(
      onSnapshot(
        qLab,
        (snap) => {
          snap.docs.forEach(d => recordsMap.set(d.id, parseQueryDoc(d)));
          notify();
        },
        () => {}
      )
    );
  }

  return () => {
    unsubs.forEach(u => {
      try { u(); } catch (_) {}
    });
  };
}

export async function createQuery(
  queryData: AcademicQuery
): Promise<void> {
  const path = `${COLLECTION}/${queryData.id}`;
  try {
    const docRef = doc(db, COLLECTION, queryData.id);
    const creatorId = queryData.createdByUserId || queryData.createdBy || queryData.studentId;
    const recipientId = queryData.recipientUserId || queryData.recipientId;
    const deptId = queryData.departmentId || queryData.recipientDepartment || queryData.department;

    const payload = sanitizeForFirestore({
      ...queryData,
      createdByUserId: creatorId,
      createdBy: creatorId,
      studentId: creatorId,
      recipientUserId: recipientId,
      recipientId: recipientId,
      departmentId: deptId,
      senderRole: queryData.senderRole || queryData.createdByRole || 'student',
      createdByRole: queryData.createdByRole || queryData.senderRole || 'student',
      status: queryData.status || 'open',
      createdAt: queryData.createdAt || new Date().toISOString(),
      replies: queryData.replies || [],
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload);

    await logAuditEvent({
      actorName: queryData.studentName || queryData.createdByName || 'Student',
      actorRole: queryData.senderRole || 'student',
      action: 'createQuery',
      entityType: 'query',
      entityId: queryData.id,
      metadata: {
        ticketId: queryData.ticketId,
        category: queryData.category,
        createdByUserId: creatorId,
        recipientUserId: recipientId,
        recipientRole: queryData.recipientRole,
        departmentId: deptId
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addQueryResponse(
  queryId: string,
  reply: QueryReply,
  existingReplies: QueryReply[]
): Promise<void> {
  const path = `${COLLECTION}/${queryId}`;
  try {
    const docRef = doc(db, COLLECTION, queryId);
    const normalizedReply: QueryReply = {
      ...reply,
      authorName: reply.authorName || reply.senderName || 'Staff',
      authorRole: reply.authorRole || reply.senderRole || 'faculty',
      senderName: reply.senderName || reply.authorName || 'Staff',
      senderRole: reply.senderRole || reply.authorRole || 'faculty'
    };
    const updatedReplies = [...existingReplies, normalizedReply];

    // 1. Write to subcollection queries/{queryId}/responses/{responseId}
    const responseRef = doc(db, COLLECTION, queryId, 'responses', reply.id);
    await setDoc(responseRef, sanitizeForFirestore({
      ...normalizedReply,
      createdAt: serverTimestamp()
    }));

    // 2. Update parent query status and replies array
    await updateDoc(docRef, sanitizeForFirestore({
      replies: updatedReplies,
      status: 'in_progress',
      updatedAt: serverTimestamp()
    }));

    await logAuditEvent({
      actorName: normalizedReply.authorName,
      actorRole: normalizedReply.authorRole,
      action: 'addQueryResponse',
      entityType: 'query',
      entityId: queryId,
      metadata: { replyId: reply.id }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateQueryStatus(
  queryId: string,
  status: 'open' | 'in_progress' | 'resolved',
  actorName = 'Staff / Faculty'
): Promise<void> {
  const path = `${COLLECTION}/${queryId}`;
  try {
    const docRef = doc(db, COLLECTION, queryId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });

    await logAuditEvent({
      actorName,
      actorRole: 'faculty',
      action: 'updateQueryStatus',
      entityType: 'query',
      entityId: queryId,
      metadata: { newStatus: status }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteQuery(
  queryId: string,
  actorName = 'Staff / Admin'
): Promise<void> {
  const path = `${COLLECTION}/${queryId}`;
  try {
    const docRef = doc(db, COLLECTION, queryId);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName,
      actorRole: 'admin',
      action: 'deleteQuery',
      entityType: 'query',
      entityId: queryId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

