import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { PREFETCH_WINDOW, STREAM_URL_TTL_MS } from '../config/constants';
import { getStreamUrl } from '../lib/graph';
import { getTrackBlob } from '../lib/offline';
import { getErrorMessage } from '../utils/errors';
import type { MsalAccount, Track } from '../types';

export interface UsePlayerParams {
  ensureAccessToken: (accountToUse?: MsalAccount | null) => Promise<string>;
  orderedTracks: Track[];
  activeTrackId: string | null;
  setActiveTrackId: (id: string | null) => void;
  setStatus: (status: string) => void;
}

export interface UsePlayerResult {
  audioRef: RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  playTrack: (track: Track) => Promise<void>;
  togglePlayback: () => Promise<void>;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  changeVolume: (event: ChangeEvent<HTMLInputElement>) => void;
  handleTimeUpdate: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleError: () => void;
  resume: () => Promise<void>;
  pause: () => void;
  reset: () => void;
}

/**
 * Audio playback: resolves a track's blob (memory cache → IndexedDB → Graph),
 * drives the `<audio>` element, and prefetches the next/previous tracks so skips
 * feel instant.
 */
export function usePlayer({
  ensureAccessToken,
  orderedTracks,
  activeTrackId,
  setActiveTrackId,
  setStatus,
}: UsePlayerParams): UsePlayerResult {
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map());
  const streamUrlCacheRef = useRef<Map<string, { url: string; ts: number }>>(new Map());
  const orderedRef = useRef<Track[]>(orderedTracks);
  const activeIdRef = useRef<string | null>(activeTrackId);
  const playRequestRef = useRef(0);
  const retriedRef = useRef<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  // Apply the current volume to the media element. NOTE: we deliberately do NOT route
  // the element through a Web Audio graph — connecting an <audio> to an AudioContext
  // makes iOS suspend playback when the screen locks / app backgrounds (and can break
  // switching tracks). Plain element playback keeps lock-screen playback working.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    orderedRef.current = orderedTracks;
  }, [orderedTracks]);

  useEffect(() => {
    activeIdRef.current = activeTrackId;
  }, [activeTrackId]);

  useEffect(() => {
    const blobCache = blobUrlCacheRef.current;
    return () => {
      blobCache.forEach((url) => URL.revokeObjectURL(url));
      blobCache.clear();
    };
  }, []);

  /**
   * Resolve a URL the <audio> element can play. Offline/downloaded tracks use a local
   * blob object URL; everything else streams from OneDrive's short-lived, pre-authed
   * download URL (range-request capable) so playback starts immediately instead of
   * waiting for the whole file to download.
   */
  const resolvePlaybackUrl = useCallback(
    async (track: Track): Promise<string> => {
      const blobCache = blobUrlCacheRef.current;
      const existingBlobUrl = blobCache.get(track.id);
      if (existingBlobUrl) {
        return existingBlobUrl;
      }

      let blob: Blob | null = null;
      try {
        blob = await getTrackBlob(track.id);
      } catch {
        blob = null;
      }
      if (blob) {
        const cached = blobCache.get(track.id);
        if (cached) {
          return cached;
        }
        const url = URL.createObjectURL(blob);
        blobCache.set(track.id, url);
        return url;
      }

      const streamCache = streamUrlCacheRef.current;
      const cachedStream = streamCache.get(track.id);
      if (cachedStream && Date.now() - cachedStream.ts < STREAM_URL_TTL_MS) {
        return cachedStream.url;
      }
      const token = await ensureAccessToken();
      const url = await getStreamUrl(track.id, token);
      streamCache.set(track.id, { url, ts: Date.now() });
      return url;
    },
    [ensureAccessToken],
  );

  const playTrack = useCallback(
    async (track: Track) => {
      const requestId = playRequestRef.current + 1;
      playRequestRef.current = requestId;
      setActiveTrackId(track.id);
      setStatus(`Loading ${track.title}…`);
      try {
        const url = await resolvePlaybackUrl(track);
        // A newer selection happened while we were resolving — abandon this one so the
        // title and audio never disagree.
        if (playRequestRef.current !== requestId) {
          return;
        }
        const audio = audioRef.current;
        if (audio) {
          audio.src = url;
          audio.load();
          await audio.play();
          setIsPlaying(true);
        }
        retriedRef.current.delete(track.id);
        setStatus(`Playing ${track.title}`);
        setDuration(audioRef.current?.duration || 0);
      } catch (error) {
        if (playRequestRef.current === requestId) {
          setStatus(`Playback failed: ${getErrorMessage(error)}`);
        }
      }
    },
    [resolvePlaybackUrl, setActiveTrackId, setStatus],
  );

  /**
   * The <audio> element errored. A stream URL may have expired — drop the cached URL
   * and retry the active track once.
   */
  const handleError = useCallback(() => {
    const id = activeIdRef.current;
    if (!id || retriedRef.current.has(id)) {
      return;
    }
    const track = orderedRef.current.find((item) => item.id === id);
    if (!track) {
      return;
    }
    retriedRef.current.add(id);
    streamUrlCacheRef.current.delete(id);
    void playTrack(track);
  }, [playTrack]);

  const playNext = useCallback(() => {
    const list = orderedRef.current;
    if (!list.length) {
      return;
    }
    const currentIndex = list.findIndex((track) => track.id === activeIdRef.current);
    const nextTrack = list[(currentIndex + 1) % list.length];
    if (nextTrack) {
      void playTrack(nextTrack);
    }
  }, [playTrack]);

  const playPrevious = useCallback(() => {
    const list = orderedRef.current;
    if (!list.length) {
      return;
    }
    const currentIndex = list.findIndex((track) => track.id === activeIdRef.current);
    const previousTrack = list[(currentIndex - 1 + list.length) % list.length];
    if (previousTrack) {
      void playTrack(previousTrack);
    }
  }, [playTrack]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        setStatus(`Playback error: ${getErrorMessage(error)}`);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [setStatus]);

  const resume = useCallback(async () => {
    try {
      await audioRef.current?.play();
      setIsPlaying(true);
    } catch {
      /* ignore */
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setProgress(time);
    }
  }, []);

  const changeVolume = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const currentTime = audio.currentTime || 0;
    const totalDuration = audio.duration || 0;
    setProgress(currentTime);
    setDuration(totalDuration);
    if (
      'mediaSession' in navigator &&
      navigator.mediaSession.setPositionState &&
      Number.isFinite(totalDuration) &&
      totalDuration > 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: totalDuration,
          position: Math.min(currentTime, totalDuration),
          playbackRate: audio.playbackRate || 1,
        });
      } catch {
        /* setPositionState can throw on some browsers; ignore */
      }
    }
  }, []);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);

  useEffect(() => {
    if (!activeTrackId) {
      return;
    }
    const list = orderedTracks;
    const index = list.findIndex((track) => track.id === activeTrackId);
    if (index === -1) {
      return;
    }
    // Pre-resolve stream URLs (or blob URLs) for the neighbours so next/previous start
    // instantly. These are cheap (a small JSON request), not full downloads.
    for (let offset = -PREFETCH_WINDOW; offset <= PREFETCH_WINDOW; offset += 1) {
      const track = list[index + offset];
      if (track) {
        resolvePlaybackUrl(track).catch(() => {});
      }
    }
  }, [activeTrackId, orderedTracks, resolvePlaybackUrl]);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    playRequestRef.current += 1;
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setActiveTrackId(null);
    blobUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlCacheRef.current.clear();
    streamUrlCacheRef.current.clear();
    retriedRef.current.clear();
  }, [setActiveTrackId]);

  return {
    audioRef,
    isPlaying,
    progress,
    duration,
    volume,
    playTrack,
    togglePlayback,
    playNext,
    playPrevious,
    seek,
    changeVolume,
    handleTimeUpdate,
    handlePlay,
    handlePause,
    handleError,
    resume,
    pause,
    reset,
  };
}
