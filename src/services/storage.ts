import { getStorage, ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from '../lib/firebase';

export const storage = getStorage(app);

/**
 * Uploads attendance session class photo evidence to Firebase Storage
 * with automatic fallback to data URL for seamless reliability.
 */
export async function uploadAttendancePhoto(
  photoData: string | File,
  sessionId: string
): Promise<string> {
  const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `attendance_evidence/${cleanSessionId}_${Date.now()}.jpg`;

  try {
    const storageRef = ref(storage, path);

    if (typeof photoData === 'string') {
      if (photoData.startsWith('data:')) {
        await uploadString(storageRef, photoData, 'data_url');
      } else if (photoData.startsWith('http://') || photoData.startsWith('https://')) {
        return photoData;
      } else {
        await uploadString(storageRef, photoData);
      }
    } else {
      await uploadBytes(storageRef, photoData);
    }

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (storageError) {
    console.warn('[Storage] Upload note (falling back to data URL payload):', storageError);
    if (typeof photoData === 'string') {
      return photoData;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(photoData);
    });
  }
}

/**
 * Uploads a Unit study note document to Firebase Storage
 * with automatic fallback to data URL for dev/offline resilience.
 */
export async function uploadUnitNoteFile(
  file: File,
  metadata: {
    departmentId?: string;
    classroomId?: string;
    subjectId?: string;
    unitId?: string;
  }
): Promise<{ downloadUrl: string; storagePath: string }> {
  const cleanDept = (metadata.departmentId || 'dept').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanClass = (metadata.classroomId || 'classroom').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanSub = (metadata.subjectId || 'subject').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanUnit = (metadata.unitId || 'unit').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const storagePath = `unit_notes/${cleanDept}/${cleanClass}/${cleanSub}/${cleanUnit}/${Date.now()}_${cleanFileName}`;

  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { downloadUrl, storagePath };
  } catch (storageError) {
    console.warn('[Storage] Firebase storage upload failed, using client data URL fallback:', storageError);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
    return { downloadUrl: dataUrl, storagePath: '' };
  }
}

/**
 * Deletes a Unit study note document from Firebase Storage
 */
export async function deleteUnitNoteFile(storagePath?: string): Promise<void> {
  if (!storagePath) return;
  try {
    const { deleteObject } = await import('firebase/storage');
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('[Storage] File delete notice (may have already been deleted):', err);
  }
}
