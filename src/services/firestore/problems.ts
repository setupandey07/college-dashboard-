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
import { InnovationProject } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errors';
import { logAuditEvent } from './auditLogs';
import { formatFirestoreDate, compareDatesDesc } from '../../lib/dateUtils';

const COLLECTION = 'problems';

export function subscribeProblems(
  onData: (projects: InnovationProject[]) => void,
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
          submittedDate: formatFirestoreDate(data.submittedDate, '2025-02-10')
        };
      }) as InnovationProject[];
      list.sort((a, b) => compareDatesDesc(a.submittedDate, b.submittedDate));
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

export async function createProblem(
  project: InnovationProject
): Promise<void> {
  const path = `${COLLECTION}/${project.id}`;
  try {
    const docRef = doc(db, COLLECTION, project.id);
    const payload = sanitizeForFirestore({
      ...project,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload);

    await logAuditEvent({
      actorName: project.leadStudent,
      actorRole: 'student',
      action: 'createProblem',
      entityType: 'problem',
      entityId: project.id,
      metadata: { title: project.title, domain: project.domain }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateProblemStatus(
  projectId: string,
  status: InnovationProject['status'],
  fundingAmount?: string,
  actorName = 'Innovation Cell / Admin'
): Promise<void> {
  const path = `${COLLECTION}/${projectId}`;
  try {
    const docRef = doc(db, COLLECTION, projectId);
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: serverTimestamp()
    };
    if (fundingAmount !== undefined) {
      updatePayload.fundingAmount = fundingAmount;
    }
    await updateDoc(docRef, updatePayload);

    await logAuditEvent({
      actorName,
      actorRole: 'admin',
      action: 'updateProblemStatus',
      entityType: 'problem',
      entityId: projectId,
      metadata: { status, fundingAmount }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addProblemComment(
  projectId: string,
  commentId: string,
  authorName: string,
  text: string
): Promise<void> {
  const path = `${COLLECTION}/${projectId}/comments/${commentId}`;
  try {
    const commentRef = doc(db, COLLECTION, projectId, 'comments', commentId);
    await setDoc(commentRef, {
      id: commentId,
      authorName,
      text,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProblem(
  projectId: string,
  actorName = 'Innovation Cell / Admin'
): Promise<void> {
  const path = `${COLLECTION}/${projectId}`;
  try {
    const docRef = doc(db, COLLECTION, projectId);
    await deleteDoc(docRef);

    await logAuditEvent({
      actorName,
      actorRole: 'admin',
      action: 'deleteProblem',
      entityType: 'problem',
      entityId: projectId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

