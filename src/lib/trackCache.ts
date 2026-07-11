import { TRACKS_CACHE_PREFIX } from '../config/constants';
import { normalizeTrackMetadata } from '../utils/tracks';
import type { Track } from '../types';

// Persist the synced track list (metadata only) in localStorage, keyed by folder, so
// the library shows instantly on reload — like downloaded songs, but for the whole list.

function keyFor(folderPath: string): string {
  return `${TRACKS_CACHE_PREFIX}${folderPath || ''}`;
}

export function loadCachedTracks(folderPath: string): Track[] | null {
  try {
    const raw = localStorage.getItem(keyFor(folderPath));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Track[];
    return Array.isArray(parsed) ? parsed.map(normalizeTrackMetadata) : null;
  } catch {
    return null;
  }
}

export function saveCachedTracks(folderPath: string, tracks: Track[]): void {
  try {
    localStorage.setItem(keyFor(folderPath), JSON.stringify(tracks));
  } catch {
    // Storage full or unavailable — caching is best-effort.
  }
}

export function clearCachedTracks(folderPath: string): void {
  try {
    localStorage.removeItem(keyFor(folderPath));
  } catch {
    /* ignore */
  }
}
