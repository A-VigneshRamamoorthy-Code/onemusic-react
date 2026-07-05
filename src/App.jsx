import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import AlbumArt, { artworkDataUrl } from './AlbumArt';

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'wma', 'mpeg', 'mp4', 'm4b', 'alac']);
const SCOPES = ['User.Read', 'Files.Read.All', 'offline_access'];
const DEFAULT_CLIENT_ID = '61ca244b-acb8-4bba-b3bf-9829b60d9981';
// Use the multi-tenant "common" endpoint so personal Microsoft accounts resolve to
// their own consumer OneDrive. The org tenant 3ff6bc31-5c2f-4e94-86ea-8946fe39d617
// has no SharePoint/OneDrive (SPO) license, so /me/drive fails there ("Tenant does
// not have a SPO license."). Override with ?tenant=<id> if you need a specific tenant.
const DEFAULT_TENANT_ID = 'common';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  const safeSeconds = Math.floor(seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function isAudioFile(name) {
  const extension = name.split('.').pop()?.toLowerCase();
  return Boolean(extension && AUDIO_EXTENSIONS.has(extension));
}

function normalizeFolderPath(rawPath) {
  return (rawPath || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^my files\/?/i, '')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

function buildFolderRoute(rawPath) {
  const clean = normalizeFolderPath(rawPath);
  if (!clean) {
    return '/me/drive/root/children';
  }
  const encoded = clean.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `/me/drive/root:/${encoded}:/children`;
}

function folderLabel(rawPath) {
  const clean = normalizeFolderPath(rawPath);
  return clean ? `My files/${clean}` : 'My files';
}

function buildTrackMetadata(item) {
  const fileName = item.name.replace(/\.[^/.]+$/, '');
  const cleaned = fileName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  const artist = words.length > 1 && !words[0].match(/^\d+$/) ? words[0] : 'OneDrive';
  const title = words.length > 1 ? words.slice(1).join(' ') : cleaned || item.name;
  const album = item.parentReference?.path?.split('/').filter(Boolean).pop() || 'Music';
  return {
    id: item.id,
    name: item.name,
    title,
    artist,
    album,
    mimeType: item.file?.mimeType || 'audio/mpeg',
    path: item.parentReference?.path || '',
  };
}

function App() {
  const [account, setAccount] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderPath, setFolderPath] = useState(() => {
    try {
      return localStorage.getItem('onemusic.folderPath') || '';
    } catch (storageError) {
      return '';
    }
  });
  const [status, setStatus] = useState('Sign in with Microsoft to browse your OneDrive music library.');
  const [authState, setAuthState] = useState('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [isNowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [isSyncOpen, setSyncOpen] = useState(true);
  const audioRef = useRef(null);
  const msalRef = useRef(null);
  const objectUrlRef = useRef('');
  const scanIdRef = useRef(0);
  const config = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      clientId: params.get('clientId') || DEFAULT_CLIENT_ID,
      tenant: params.get('tenant') || DEFAULT_TENANT_ID,
      redirectUri: params.get('redirectUri') || `${window.location.origin}${window.location.pathname}`,
    };
  }, []);

  useEffect(() => {
    const initialize = async () => {
      if (!config.clientId) {
        setAuthState('config');
        setStatus('Add your Microsoft Entra app registration client ID using ?clientId=... to connect OneDrive.');
        setIsLoading(false);
        return;
      }

      const instance = new PublicClientApplication({
        auth: {
          clientId: config.clientId,
          authority: `https://login.microsoftonline.com/${config.tenant}`,
          redirectUri: config.redirectUri,
        },
        cache: {
          cacheLocation: 'sessionStorage',
          storeAuthStateInCookie: false,
        },
      });

      msalRef.current = instance;
      try {
        await instance.initialize();
        let redirectResult = null;
        try {
          redirectResult = await instance.handleRedirectPromise();
        } catch (redirectError) {
          // A stale or interrupted interaction (e.g. left over from a previous
          // popup-based build) can leave the temporary cache in a bad state such
          // as no_token_request_cache_error. Clear it and continue so the user can
          // simply sign in again instead of being stuck on an error.
          try {
            await instance.clearCache();
          } catch (clearError) {
            /* best effort */
          }
          redirectResult = null;
        }
        const activeAccount = redirectResult?.account || instance.getAllAccounts()[0] || null;
        if (activeAccount) {
          instance.setActiveAccount(activeAccount);
          setAccount(activeAccount);
          setStatus(`Signed in as ${activeAccount.username}. Enter a folder under "My files" and hit Sync.`);
          setAuthState('ready');
          setIsLoading(false);
        } else {
          setAuthState('ready');
          setStatus('Sign in with Microsoft to browse your OneDrive music library.');
          setIsLoading(false);
        }
      } catch (error) {
        setAuthState('error');
        setStatus(`MSAL initialization failed: ${error.message}`);
        setIsLoading(false);
      }
    };

    initialize();
  }, [config.clientId, config.redirectUri, config.tenant]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isNowPlayingOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setNowPlayingOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isNowPlayingOpen]);

  const visibleTracks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return tracks;
    }
    return tracks.filter((track) => `${track.title} ${track.artist} ${track.album} ${track.name}`.toLowerCase().includes(query));
  }, [searchTerm, tracks]);

  const activeTrack = useMemo(() => tracks.find((track) => track.id === activeTrackId) || null, [activeTrackId, tracks]);

  const ensureAccessToken = async (accountToUse = account) => {
    if (!msalRef.current) {
      throw new Error('Authentication is not ready yet.');
    }
    if (!accountToUse) {
      throw new Error('Please sign in first.');
    }

    try {
      const response = await msalRef.current.acquireTokenSilent({
        account: accountToUse,
        scopes: SCOPES,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError || error.errorCode === 'consent_required' || error.errorCode === 'interaction_required') {
        await msalRef.current.acquireTokenRedirect({ account: accountToUse, scopes: SCOPES });
        return '';
      }
      throw error;
    }
  };

  const walkDriveNode = async (route, token, onBatch, shouldStop) => {
    if (shouldStop && shouldStop()) {
      return;
    }
    let url = route.startsWith('http') ? route : `https://graph.microsoft.com/v1.0${route}`;
    while (url) {
      if (shouldStop && shouldStop()) {
        return;
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let detail = `status ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody?.error?.message) {
            detail = errorBody.error.message;
          }
        } catch (parseError) {
          /* fall back to the status-based detail */
        }
        throw new Error(`OneDrive scan failed: ${detail}`);
      }

      const payload = await response.json();
      const children = payload.value || [];
      const foundHere = [];
      const subfolders = [];

      for (const child of children) {
        if (child.folder) {
          subfolders.push(child);
        } else if (isAudioFile(child.name)) {
          foundHere.push(buildTrackMetadata(child));
        }
      }

      if (foundHere.length) {
        onBatch(foundHere);
      }

      for (const folder of subfolders) {
        await walkDriveNode(`/me/drive/items/${folder.id}/children`, token, onBatch, shouldStop);
      }

      url = payload['@odata.nextLink'] || '';
    }
  };

  const loadTracks = async (instance, accountToUse = account, rawPath = folderPath) => {
    if (!instance || !accountToUse) {
      return;
    }
    const label = folderLabel(rawPath);
    const scanId = scanIdRef.current + 1;
    scanIdRef.current = scanId;
    const shouldStop = () => scanIdRef.current !== scanId;

    setIsLoading(true);
    setTracks([]);
    setQueue([]);
    setStatus(`Scanning ${label}…`);

    const seen = new Set();
    let count = 0;

    try {
      const token = await ensureAccessToken(accountToUse);
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
          count += fresh.length;
          setTracks((previous) => {
            const merged = previous.concat(fresh);
            merged.sort((left, right) => left.title.localeCompare(right.title));
            return merged;
          });
          setActiveTrackId((current) => current || fresh[0].id);
          setQueue((previous) => (previous.length >= 8 ? previous : previous.concat(fresh).slice(0, 8)));
          setStatus(`Scanning ${label}… found ${count} track${count === 1 ? '' : 's'} so far.`);
        },
        shouldStop,
      );

      if (shouldStop()) {
        return;
      }
      setStatus(
        count
          ? `Loaded ${count} audio file${count === 1 ? '' : 's'} from ${label}.`
          : `No audio files found in ${label}.`,
      );
      if (count) {
        setSyncOpen(false);
      }
    } catch (error) {
      if (shouldStop()) {
        return;
      }
      setStatus(`Sync failed for ${label}: ${error.message}`);
    } finally {
      if (!shouldStop()) {
        setIsLoading(false);
      }
    }
  };

  const handleSync = async () => {
    if (!account) {
      setStatus('Please sign in with Microsoft first.');
      return;
    }
    const clean = normalizeFolderPath(folderPath);
    if (clean !== folderPath) {
      setFolderPath(clean);
    }
    try {
      localStorage.setItem('onemusic.folderPath', clean);
    } catch (storageError) {
      /* ignore storage failures */
    }
    await loadTracks(msalRef.current, account, clean);
  };

  const handleSignIn = async () => {
    if (!msalRef.current) {
      setStatus('Authentication is still loading.');
      return;
    }

    if (account) {
      setAccount(null);
      setTracks([]);
      setQueue([]);
      setActiveTrackId(null);
      setStatus('Signed out. Connect again when you are ready.');
      setAuthState('idle');
      try {
        msalRef.current.setActiveAccount(null);
        await msalRef.current.clearCache();
      } catch (clearError) {
        /* best effort — clearing local cache should not block sign-out */
      }
      return;
    }

    setIsLoading(true);
    try {
      setStatus('Redirecting to Microsoft sign-in…');
      await msalRef.current.loginRedirect({ scopes: SCOPES, prompt: 'select_account' });
    } catch (error) {
      setStatus(`Sign-in failed: ${error.message}`);
      setAuthState('error');
      setIsLoading(false);
    }
  };

  const handleRefreshLibrary = async () => {
    if (!account) {
      return;
    }
    await loadTracks(msalRef.current, account, folderPath);
  };

  const handleTrackSelect = async (track) => {
    setActiveTrackId(track.id);
    setQueue((current) => {
      const withoutTrack = current.filter((item) => item.id !== track.id);
      return [track, ...withoutTrack].slice(0, 8);
    });

    if (!objectUrlRef.current) {
      setStatus(`Preparing ${track.title}...`);
    }

    try {
      const token = await ensureAccessToken();
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${track.id}/content`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Audio download failed with status ${response.status}`);
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;

      if (audioRef.current) {
        audioRef.current.src = objectUrl;
        audioRef.current.load();
        await audioRef.current.play();
        setIsPlaying(true);
      }

      setStatus(`Playing ${track.title}`);
      setDuration(audioRef.current?.duration || 0);
    } catch (error) {
      setStatus(`Playback failed: ${error.message}`);
    }
  };

  const togglePlayback = async () => {
    if (!audioRef.current) {
      return;
    }
    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        setStatus(`Playback error: ${error.message}`);
      }
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const playNext = () => {
    const list = tracks.length ? tracks : queue;
    if (!list.length) {
      return;
    }
    const currentIndex = list.findIndex((track) => track.id === activeTrackId);
    const nextTrack = list[(currentIndex + 1) % list.length];
    if (nextTrack) {
      handleTrackSelect(nextTrack);
    }
  };

  const playPrevious = () => {
    const list = tracks.length ? tracks : queue;
    if (!list.length) {
      return;
    }
    const currentIndex = list.findIndex((track) => track.id === activeTrackId);
    const previousTrack = list[(currentIndex - 1 + list.length) % list.length];
    if (previousTrack) {
      handleTrackSelect(previousTrack);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) {
      return;
    }
    const currentTime = audioRef.current.currentTime || 0;
    const totalDuration = audioRef.current.duration || 0;
    setProgress(currentTime);
    setDuration(totalDuration);
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && Number.isFinite(totalDuration) && totalDuration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: totalDuration,
          position: Math.min(currentTime, totalDuration),
          playbackRate: audioRef.current.playbackRate || 1,
        });
      } catch (positionError) {
        /* setPositionState can throw on some browsers; ignore */
      }
    }
  };

  const handleVolumeChange = (event) => {
    const value = Number(event.target.value);
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return undefined;
    }
    const session = navigator.mediaSession;

    if (activeTrack && typeof window.MediaMetadata === 'function') {
      try {
        session.metadata = new window.MediaMetadata({
          title: activeTrack.title || activeTrack.name || 'Unknown title',
          artist: activeTrack.artist || 'OneMusic',
          album: activeTrack.album || 'OneDrive',
          artwork: [
            { src: artworkDataUrl(activeTrack.id), sizes: '512x512', type: 'image/svg+xml' },
          ],
        });
      } catch (metadataError) {
        /* MediaMetadata may be unavailable */
      }
    }

    try {
      session.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (stateError) {
      /* playbackState is best-effort */
    }

    const resume = async () => {
      try {
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (playError) {
        /* ignore */
      }
    };
    const pause = () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    };
    const setHandler = (action, handler) => {
      try {
        session.setActionHandler(action, handler);
      } catch (handlerError) {
        /* unsupported action */
      }
    };

    setHandler('play', resume);
    setHandler('pause', pause);
    setHandler('previoustrack', () => playPrevious());
    setHandler('nexttrack', () => playNext());
    setHandler('seekto', (details) => {
      if (audioRef.current && details && typeof details.seekTime === 'number') {
        audioRef.current.currentTime = details.seekTime;
        setProgress(details.seekTime);
      }
    });

    return undefined;
  }, [activeTrack, isPlaying, tracks]);

  return (
    <div className={`app ${isNowPlayingOpen ? 'app--locked' : ''}`}>
      <header className="app-header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">♫</span>
          <div className="brand__text">
            <span className="brand__eyebrow">Microsoft OneDrive</span>
            <h1 className="brand__title">OneMusic</h1>
          </div>
        </div>
        <div className="app-header__actions">
          {account ? (
            <>
              <button className="icon-btn" type="button" onClick={() => setSyncOpen((open) => !open)} aria-label="Folder to sync" title="Folder to sync" aria-pressed={isSyncOpen}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </button>
              <button className="icon-btn" type="button" onClick={handleRefreshLibrary} disabled={isLoading} aria-label="Refresh library" title="Refresh library">
                <svg className={isLoading ? 'is-spinning' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M21 21v-5h-5" />
                </svg>
              </button>
              <button className="icon-btn" type="button" onClick={handleSignIn} aria-label="Sign out" title="Sign out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          ) : (
            <button className="btn btn--brand" type="button" onClick={handleSignIn}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!account ? (
          <section className="hero">
            <div className="hero__art" aria-hidden="true">
              <AlbumArt seed="onemusic-hero-vinyl" />
            </div>
            <div className="hero__copy">
              <p className="eyebrow">Real music from OneDrive</p>
              <h2 className="hero__title">Your music, streamed straight from OneDrive.</h2>
              <p className="lead">Sign in with Microsoft, point OneMusic at a folder, and play your audio files anywhere — phone or desktop.</p>
              <button className="btn btn--brand btn--lg" type="button" onClick={handleSignIn}>Sign in with Microsoft</button>
              <p className={`hero__status ${authState === 'error' ? 'is-error' : ''}`} aria-live="polite">{status}</p>
            </div>
          </section>
        ) : (
          <>
            {isSyncOpen ? (
            <section className="sync-card" aria-live="polite">
              <div className="sync-card__head">
                <p className="eyebrow">Folder to sync</p>
                <span className="account-chip" title={account.username}>{account.username}</span>
              </div>
              <div className="sync-row">
                <div className="sync-field">
                  <span className="sync-field__prefix">My files /</span>
                  <input
                    className="sync-field__input"
                    type="text"
                    value={folderPath}
                    placeholder="Music/Melody"
                    aria-label="Folder path under My files"
                    onChange={(event) => setFolderPath(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { handleSync(); } }}
                  />
                </div>
                <button className="btn btn--brand" type="button" onClick={handleSync} disabled={isLoading}>
                  {isLoading ? 'Syncing…' : 'Sync'}
                </button>
              </div>
              <p className="sync-hint">{status}</p>
            </section>
            ) : null}

            <section className="library">
              <div className="library__head">
                <h2 className="library__title">
                  {isLoading ? 'Scanning…' : tracks.length ? `${tracks.length} track${tracks.length === 1 ? '' : 's'}` : 'Your library'}
                </h2>
                <div className="search">
                  <span className="search__icon" aria-hidden="true">⌕</span>
                  <input className="search__input" type="search" value={searchTerm} placeholder="Search" aria-label="Search tracks" onChange={(event) => setSearchTerm(event.target.value)} />
                </div>
              </div>

              {visibleTracks.length > 0 ? (
                <ul className="track-list">
                  {isLoading ? (
                    <li className="scan-banner">Still scanning {folderLabel(folderPath)} — tap any track to play now.</li>
                  ) : null}
                  {visibleTracks.map((track, index) => {
                    const isActive = activeTrack?.id === track.id;
                    return (
                      <li key={track.id} className={`track ${isActive ? 'track--active' : ''}`} style={{ '--row': index % 12 }}>
                        <button className="track__main" type="button" onClick={() => handleTrackSelect(track)}>
                          <span className="track__art">
                            <AlbumArt seed={track.id} playing={isActive && isPlaying} />
                            <span className="track__overlay" aria-hidden="true">
                              {isActive && isPlaying ? (
                                <span className="track__eq"><i /><i /><i /></span>
                              ) : (
                                <span className="track__play">▶</span>
                              )}
                            </span>
                          </span>
                          <span className="track__meta">
                            <span className="track__title">{track.title}</span>
                            <span className="track__sub">{track.artist} • {track.album}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : isLoading ? (
                <div className="placeholder">
                  <div className="placeholder__spinner" aria-hidden="true" />
                  <p>Scanning {folderLabel(folderPath)} for audio files…</p>
                </div>
              ) : (
                <div className="placeholder">
                  <AlbumArt seed="empty-state" className="placeholder__art" />
                  <p>No tracks yet. Enter a folder under “My files” and hit Sync.</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {activeTrack ? (
        <div className="mini-player">
          <span className="mini-player__bar" aria-hidden="true">
            <span className="mini-player__bar-fill" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
          </span>
          <button className="mini-player__open" type="button" onClick={() => setNowPlayingOpen(true)} aria-label="Open now playing">
            <span className="mini-player__art">
              <AlbumArt seed={activeTrack.id} playing={isPlaying} />
            </span>
            <span className="mini-player__meta">
              <span className="mini-player__title">{activeTrack.title}</span>
              <span className="mini-player__sub">{activeTrack.artist}</span>
            </span>
            <span className="mini-player__expand" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
            </span>
          </button>
          <div className="mini-player__controls">
            <button className="icon-btn" type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <button className="icon-btn mini-player__next" type="button" onClick={playNext} aria-label="Next track">⏭</button>
          </div>
        </div>
      ) : null}

      {activeTrack ? (
        <div className={`now-playing ${isNowPlayingOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Now playing" aria-hidden={!isNowPlayingOpen}>
          <div className="now-playing__backdrop" onClick={() => setNowPlayingOpen(false)} />
          <div className="now-playing__sheet">
            <button className="now-playing__grip" type="button" onClick={() => setNowPlayingOpen(false)} aria-label="Close now playing" />
            <div className="now-playing__art-wrap">
              <AlbumArt seed={activeTrack.id} playing={isPlaying} spin className="now-playing__art" />
            </div>
            <div className="now-playing__meta">
              <p className="eyebrow">Now playing</p>
              <h2 className="now-playing__title">{activeTrack.title}</h2>
              <p className="now-playing__sub">{activeTrack.artist} • {activeTrack.album}</p>
            </div>
            <div className="scrubber">
              <input
                className="scrubber__range"
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={progress}
                aria-label="Seek"
                onChange={(event) => { if (audioRef.current) { audioRef.current.currentTime = Number(event.target.value); setProgress(Number(event.target.value)); } }}
              />
              <div className="scrubber__times">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            <div className="transport">
              <button className="icon-btn icon-btn--lg" type="button" onClick={playPrevious} aria-label="Previous track">⏮</button>
              <button className="play-btn" type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button className="icon-btn icon-btn--lg" type="button" onClick={playNext} aria-label="Next track">⏭</button>
            </div>
            <label className="volume" htmlFor="np-volume">
              <span aria-hidden="true">🔈</span>
              <input id="np-volume" type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" onChange={handleVolumeChange} />
              <span aria-hidden="true">🔊</span>
            </label>
          </div>
        </div>
      ) : null}

      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={handleTimeUpdate}
        onTimeUpdate={handleTimeUpdate}
        onEnded={playNext}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </div>
  );
}

export default App;
