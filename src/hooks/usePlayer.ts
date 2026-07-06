import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { PREFETCH_WINDOW } from '../config/constants';
import { fetchTrackContent } from '../lib/graph';
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
  const cacheRef = useRef<Map<string, string>>(new Map());
  const orderedRef = useRef<Track[]>(orderedTracks);
  const activeIdRef = useRef<string | null>(activeTrackId);
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
    const cache = cacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const resolveObjectUrl = useCallback(
    async (track: Track): Promise<string> => {
      const cache = cacheRef.current;
      const existing = cache.get(track.id);
      if (existing) {
        return existing;
      }
      let blob: Blob | null = null;
      try {
        blob = await getTrackBlob(track.id);
      } catch {
        blob = null;
      }
      if (!blob) {
        const token = await ensureAccessToken();
        blob = await fetchTrackContent(track.id, token);
      }
      const cached = cache.get(track.id);
      if (cached) {
        return cached;
      }
      const url = URL.createObjectURL(blob);
      cache.set(track.id, url);
      return url;
    },
    [ensureAccessToken],
  );

  const playTrack = useCallback(
    async (track: Track) => {
      setActiveTrackId(track.id);
      if (!cacheRef.current.has(track.id)) {
        setStatus(`Preparing ${track.title}…`);
      }
      try {
        const objectUrl = await resolveObjectUrl(track);
        const audio = audioRef.current;
        if (audio) {
          audio.src = objectUrl;
          audio.load();
          await audio.play();
          setIsPlaying(true);
        }
        setStatus(`Playing ${track.title}`);
        setDuration(audioRef.current?.duration || 0);
      } catch (error) {
        setStatus(`Playback failed: ${getErrorMessage(error)}`);
      }
    },
    [resolveObjectUrl, setActiveTrackId, setStatus],
  );

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
    const windowIds = new Set<string>();
    for (let offset = -PREFETCH_WINDOW; offset <= PREFETCH_WINDOW; offset += 1) {
      const track = list[index + offset];
      if (track) {
        windowIds.add(track.id);
      }
    }
    windowIds.forEach((id) => {
      if (!cacheRef.current.has(id)) {
        const track = list.find((item) => item.id === id);
        if (track) {
          resolveObjectUrl(track).catch(() => {});
        }
      }
    });
    cacheRef.current.forEach((url, id) => {
      if (!windowIds.has(id)) {
        URL.revokeObjectURL(url);
        cacheRef.current.delete(id);
      }
    });
  }, [activeTrackId, orderedTracks, resolveObjectUrl]);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setActiveTrackId(null);
    cacheRef.current.forEach((url) => URL.revokeObjectURL(url));
    cacheRef.current.clear();
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
    resume,
    pause,
    reset,
  };
}
