import type { DownloadedTrackMeta, Track } from '../types';
import { normalizeTrackMetadata } from '../utils/tracks';

// IndexedDB-backed offline store for downloaded tracks. Blobs persist across
// reloads and tab closes so downloaded music is available offline.

const DB_NAME = 'onemusic';
const STORE = 'tracks';
const VERSION = 1;

interface StoredTrack extends DownloadedTrackMeta {
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrack(track: Track, blob: Blob): Promise<boolean> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const record: StoredTrack = {
        id: track.id,
        name: track.name,
        title: track.title,
        artist: track.artist,
        album: track.album,
        mimeType: track.mimeType || blob.type || 'audio/mpeg',
        size: blob.size,
        blob,
        savedAt: Date.now(),
      };
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return true;
}

export async function getTrackBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => {
        const result = request.result as StoredTrack | undefined;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function listTracks(): Promise<DownloadedTrackMeta[]> {
  const db = await openDB();
  try {
    return await new Promise<DownloadedTrackMeta[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => {
        const rows = (request.result as StoredTrack[]) || [];
        // Strip the blob so we don't hold every audio file in memory.
        const meta: DownloadedTrackMeta[] = rows.map((row) => ({
          ...normalizeTrackMetadata({
            id: row.id,
            name: row.name,
            title: row.title,
            artist: row.artist,
            album: row.album,
            mimeType: row.mimeType,
          }),
          size: row.size,
          savedAt: row.savedAt,
        }));
        meta.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        resolve(meta);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteTrack(id: string): Promise<boolean> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return true;
}

export async function clearTracks(): Promise<boolean> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return true;
}
