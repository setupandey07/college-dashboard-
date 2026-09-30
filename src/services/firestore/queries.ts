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
import { AcademicQuery, QueryReply, UserRole } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';
import { formatFirestoreDate, compareDatesDesc } from '../../lib/dateUtils';

const COLLECTION = 'queries';

export function subscribeQueries(
  onData: (queries: AcademicQuery[]) => void,
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
          ...data,
          createdAt: formatFirestoreDate(data.createdAt, '2025-02-14'),
          replies: Array.isArray(data.replies)
            ? data.replies.map((r: any) => ({
                ...r,
                timestamp: formatFirestoreDate(r.timestamp, typeof r.timestamp === 'string' ? r.timestamp : '')
              }))
            : []
        };
      }) as AcademicQuery[];
      // Sort by creation date descending
      list.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt));
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

export async function createQuery(
  queryData: AcademicQuery
): Promise<void> {
  const path = `${COLLECTION}/${queryData.id}`;
  try {
    const docRef = doc(db, COLLECTION, queryData.id);
    const payload = sanitizeForFirestore({
      ...queryData,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload);

    await logAuditEvent({
      actorName: queryData.studentName,
      actorRole: 'student',
      action: 'createQuery',
      entityType: 'query',
      entityId: queryData.id,
      metadata: { ticketId: queryData.ticketId, category: queryData.category }
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
    const updatedReplies = [...existingReplies, reply];

    // 1. Write to subcollection queries/{queryId}/responses/{responseId}
    const responseRef = doc(db, COLLECTION, queryId, 'responses', reply.id);
    await setDoc(responseRef, sanitizeForFirestore({
      ...reply,
      createdAt: serverTimestamp()
    }));

    // 2. Update parent query status and replies array
    await updateDoc(docRef, sanitizeForFirestore({
      replies: updatedReplies,
      status: 'in_progress',
      updatedAt: serverTimestamp()
    }));

    await logAuditEvent({
      actorName: reply.authorName,
      actorRole: reply.authorRole,
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

