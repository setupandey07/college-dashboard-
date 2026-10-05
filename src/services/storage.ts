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
