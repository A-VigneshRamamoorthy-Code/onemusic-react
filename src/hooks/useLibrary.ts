import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { FOLDER_PATH_STORAGE_KEY } from '../config/constants';
import { walkDriveNode } from '../lib/graph';
import { loadCachedTracks, saveCachedTracks } from '../lib/trackCache';
import { getErrorMessage } from '../utils/errors';
import { buildFolderRoute, folderLabel, normalizeFolderPath } from '../utils/tracks';
import type { AlbumGroup, DownloadedTrackMeta, MsalAccount, Track, ViewMode } from '../types';

function readInitialFolderPath(): string {
  try {
    return localStorage.getItem(FOLDER_PATH_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export interface UseLibraryParams {
  account: MsalAccount | null;
  ensureAccessToken: (accountToUse?: MsalAccount | null) => Promise<string>;
  setStatus: (status: string) => void;
  setIsLoading: (loading: boolean) => void;
  downloadedTracks: DownloadedTrackMeta[];
  setActiveTrackId: Dispatch<SetStateAction<string | null>>;
}

export interface UseLibraryResult {
  tracks: Track[];
  folderPath: string;
  setFolderPath: Dispatch<SetStateAction<string>>;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  isSyncOpen: boolean;
  setSyncOpen: Dispatch<SetStateAction<boolean>>;
  visibleTracks: Track[];
  albumGroups: AlbumGroup[];
  visibleDownloaded: DownloadedTrackMeta[];
  orderedTracks: Track[];
  sync: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

function matchesQuery(track: Track, query: string): boolean {
  return `${track.title} ${track.artist} ${track.album} ${track.name}`.toLowerCase().includes(query);
}

/**
 * OneDrive library state: folder selection, streaming sync, search/view filtering
 * and the derived album groupings and ordered playlist.
 */
export function useLibrary({
  account,
  ensureAccessToken,
  setStatus,
  setIsLoading,
  downloadedTracks,
  setActiveTrackId,
}: UseLibraryParams): UseLibraryResult {
  const [tracks, setTracks] = useState<Track[]>(() => loadCachedTracks(readInitialFolderPath()) || []);
  const [folderPath, setFolderPath] = useState<string>(readInitialFolderPath);
  const [viewMode, setViewMode] = useState<ViewMode>('songs');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncOpen, setSyncOpen] = useState(true);
  const scanIdRef = useRef(0);
  const cacheLoadedRef = useRef(false);

  // When the user signs in (or the account is restored on reload), show the cached
  // track list immediately so the library survives reloads like downloaded songs do.
  useEffect(() => {
    if (!account) {
      cacheLoadedRef.current = false;
      return;
    }
    if (cacheLoadedRef.current) {
      return;
    }
    cacheLoadedRef.current = true;
    const cached = loadCachedTracks(folderPath);
    if (cached && cached.length) {
      setTracks((previous) => (previous.length ? previous : cached));
    }
  }, [account, folderPath]);

  const visibleTracks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return tracks;
    }
    return tracks.filter((track) => matchesQuery(track, query));
  }, [searchTerm, tracks]);

  const albumGroups = useMemo<AlbumGroup[]>(() => {
    const map = new Map<string, Track[]>();
    visibleTracks.forEach((track) => {
      const key = track.album || 'Unknown album';
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(track);
      } else {
        map.set(key, [track]);
      }
    });
    return Array.from(map.entries())
      .map(([album, items]) => ({
        album,
        tracks: items
          .slice()
          .sort(
            (left, right) =>
              (left.trackNumber ?? Number.MAX_SAFE_INTEGER) - (right.trackNumber ?? Number.MAX_SAFE_INTEGER) ||
              left.title.localeCompare(right.title),
          ),
      }))
      .sort((left, right) => left.album.localeCompare(right.album));
  }, [visibleTracks]);

  const visibleDownloaded = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return downloadedTracks;
    }
    return downloadedTracks.filter((track) => matchesQuery(track, query));
  }, [searchTerm, downloadedTracks]);

  const orderedTracks = useMemo<Track[]>(() => {
    if (viewMode === 'downloaded') {
      return visibleDownloaded;
    }
    if (viewMode === 'albums') {
      return albumGroups.flatMap((group) => group.tracks);
    }
    return visibleTracks;
  }, [viewMode, visibleTracks, albumGroups, visibleDownloaded]);

  const loadTracks = useCallback(
    async (rawPath: string) => {
      if (!account) {
        return;
      }
      const label = folderLabel(rawPath);
      const scanId = scanIdRef.current + 1;
      scanIdRef.current = scanId;
      const shouldStop = () => scanIdRef.current !== scanId;

      setIsLoading(true);
      setTracks([]);
      setStatus(`Scanning ${label}…`);

      const seen = new Set<string>();
      const collected: Track[] = [];
      let count = 0;

      try {
        const token = await ensureAccessToken(account);
        await walkDriveNode(
          buildFolderRoute(rawPath),
          token,
          (batch) => {
            if (shouldStop()) {
              return;
            }
            const fresh = batch.filter((track) => !seen.has(track.id));
            if (!fresh.length) {
              return;
            }
            fresh.forEach((track) => seen.add(track.id));
            collected.push(...fresh);
            count += fresh.length;
            setTracks((previous) => {
              const merged = previous.concat(fresh);
              merged.sort((left, right) => left.title.localeCompare(right.title));
              return merged;
            });
            setActiveTrackId((current) => current || fresh[0].id);
            setStatus(`Scanning ${label}… found ${count} track${count === 1 ? '' : 's'} so far.`);
          },
          shouldStop,
        );

        if (shouldStop()) {
          return;
        }
        setStatus(
          count ? `Loaded ${count} audio file${count === 1 ? '' : 's'} from ${label}.` : `No audio files found in ${label}.`,
        );
        if (count) {
          collected.sort((left, right) => left.title.localeCompare(right.title));
          saveCachedTracks(rawPath, collected);
          setSyncOpen(false);
        }
      } catch (error) {
        if (shouldStop()) {
          return;
        }
        setStatus(`Sync failed for ${label}: ${getErrorMessage(error)}`);
      } finally {
        if (!shouldStop()) {
          setIsLoading(false);
        }
      }
    },
    [account, ensureAccessToken, setStatus, setIsLoading, setActiveTrackId],
  );

  const sync = useCallback(async () => {
    if (!account) {
      setStatus('Please sign in with Microsoft first.');
      return;
    }
    const clean = normalizeFolderPath(folderPath);
    if (clean !== folderPath) {
      setFolderPath(clean);
    }
    try {
      localStorage.setItem(FOLDER_PATH_STORAGE_KEY, clean);
    } catch {
      /* ignore storage failures */
    }
    await loadTracks(clean);
  }, [account, folderPath, loadTracks, setStatus]);

  const refresh = useCallback(async () => {
    if (!account) {
      return;
    }
    await loadTracks(folderPath);
  }, [account, folderPath, loadTracks]);

  const reset = useCallback(() => {
    setTracks([]);
    setSearchTerm('');
    setViewMode('songs');
    setSyncOpen(true);
  }, []);

  return {
    tracks,
    folderPath,
    setFolderPath,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    isSyncOpen,
    setSyncOpen,
    visibleTracks,
    albumGroups,
    visibleDownloaded,
    orderedTracks,
    sync,
    refresh,
    reset,
  };
}
