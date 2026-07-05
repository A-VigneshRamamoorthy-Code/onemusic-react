import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'wma', 'mpeg', 'mp4', 'm4b', 'alac']);
const SCOPES = ['User.Read', 'Files.Read.All', 'offline_access'];
const DEFAULT_CLIENT_ID = '61ca244b-acb8-4bba-b3bf-9829b60d9981';
const DEFAULT_TENANT_ID = '3ff6bc31-5c2f-4e94-86ea-8946fe39d617';

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
  const [status, setStatus] = useState('Sign in with Microsoft to browse your OneDrive music library.');
  const [authState, setAuthState] = useState('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);
  const msalRef = useRef(null);
  const objectUrlRef = useRef('');
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
          setStatus(`Signed in as ${activeAccount.username}.`);
          setAuthState('ready');
          await loadTracks(instance, activeAccount);
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

  const walkDriveNode = async (route, items, token) => {
    const response = await fetch(`https://graph.microsoft.com/v1.0${route}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OneDrive scan failed with status ${response.status}`);
    }

    const payload = await response.json();
    const children = payload.value || [];

    for (const child of children) {
      if (child.folder) {
        await walkDriveNode(`/me/drive/items/${child.id}/children`, items, token);
      } else if (isAudioFile(child.name)) {
        items.push(buildTrackMetadata(child));
      }
    }
  };

  const loadTracks = async (instance, accountToUse = account) => {
    if (!instance || !accountToUse) {
      return;
    }
    setIsLoading(true);
    try {
      const token = await ensureAccessToken(accountToUse);
      const discovered = [];
      await walkDriveNode('/me/drive/root/children', discovered, token);
      const sorted = discovered.sort((left, right) => left.title.localeCompare(right.title));
      setTracks(sorted);
      setQueue(sorted.slice(0, Math.min(8, sorted.length)));
      if (!activeTrackId && sorted.length) {
        setActiveTrackId(sorted[0].id);
      }
      setStatus(`Loaded ${sorted.length} audio file${sorted.length === 1 ? '' : 's'} from OneDrive.`);
    } catch (error) {
      setStatus(`OneDrive sync failed: ${error.message}`);
      setAuthState('error');
    } finally {
      setIsLoading(false);
    }
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
    await loadTracks(msalRef.current, account);
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
    const currentIndex = queue.findIndex((track) => track.id === activeTrackId);
    const nextTrack = queue[(currentIndex + 1) % queue.length];
    if (nextTrack) {
      handleTrackSelect(nextTrack);
    }
  };

  const playPrevious = () => {
    const currentIndex = queue.findIndex((track) => track.id === activeTrackId);
    const previousTrack = queue[(currentIndex - 1 + queue.length) % queue.length];
    if (previousTrack) {
      handleTrackSelect(previousTrack);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) {
      return;
    }
    setProgress(audioRef.current.currentTime || 0);
    setDuration(audioRef.current.duration || 0);
  };

  const handleVolumeChange = (event) => {
    const value = Number(event.target.value);
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar card">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">♫</div>
          <div>
            <p className="section-label">Microsoft OneDrive</p>
            <h1>OneMusic</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button secondary" type="button" onClick={handleRefreshLibrary} disabled={!account || isLoading}>
            Refresh library
          </button>
          <button className="button brand" type="button" onClick={handleSignIn}>
            {account ? 'Sign out' : 'Connect OneDrive'}
          </button>
        </div>
      </header>

      <main className="content-stack">
        <section className="hero card">
          <div className="hero-copy">
            <p className="section-label">Real music from OneDrive</p>
            <h2>Your Microsoft account unlocks a live library of audio files, streamed directly into OneMusic.</h2>
            <p className="text-lead">
              Sign in with Microsoft, let Graph discover your audio files, and use the player to browse, queue, and stream them in real time.
            </p>
            <div className="button-row">
              <button className="button brand" type="button" onClick={handleSignIn}>
                {account ? 'Switch account' : 'Sign in with Microsoft'}
              </button>
            </div>
            <div className="auth-card" aria-live="polite">
              <div className="auth-card__header">
                <div>
                  <p className="section-label">Authentication</p>
                  <h3>{account ? `Signed in as ${account.username}` : 'Awaiting Microsoft sign-in'}</h3>
                </div>
                <span className={`status-pill ${account ? 'active' : ''}`}>{account ? 'Connected' : 'Offline'}</span>
              </div>
              <p className="text-lead">{status}</p>
              {config.clientId ? null : (
                <p className="text-lead">Set <code>?clientId=YOUR_APP_ID</code> and optionally <code>&tenant=common</code> before signing in.</p>
              )}
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-preview__art" aria-hidden="true" />
            <div className="player-card">
              <div className="player-card__meta">
                <p className="section-label">Now playing</p>
                <h3>{activeTrack ? activeTrack.title : 'Ready when you are'}</h3>
                <p>{activeTrack ? `${activeTrack.artist} • ${activeTrack.album}` : 'Connect OneDrive to load your music.'}</p>
              </div>
              <div className="timeline-row">
                <span>{formatTime(progress)}</span>
                <input type="range" min="0" max={duration || 100} step="0.1" value={progress} onChange={(event) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Number(event.target.value);
                    setProgress(Number(event.target.value));
                  }
                }} aria-label="Playback progress" />
                <span>{formatTime(duration)}</span>
              </div>
              <div className="player-card__controls">
                <button className="icon-button" type="button" onClick={playPrevious}>
                  ⏮
                </button>
                <button className="icon-button-large button brand" type="button" onClick={togglePlayback}>
                  {isPlaying ? '❚❚' : '▶'}
                </button>
                <button className="icon-button" type="button" onClick={playNext}>
                  ⏭
                </button>
              </div>
              <label className="volume-control" htmlFor="volume-slider">
                <span>🔊</span>
                <input id="volume-slider" type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} />
              </label>
            </div>
          </div>
        </section>

        <section className="library-grid">
          <div className="card library-card">
            <div className="panel-head">
              <div>
                <p className="section-label">OneDrive library</p>
                <h3>{isLoading ? 'Scanning your music…' : 'Browse the tracks'}</h3>
              </div>
              <input className="search-input" type="search" value={searchTerm} placeholder="Search tracks" onChange={(event) => setSearchTerm(event.target.value)} />
            </div>

            {isLoading ? (
              <div className="empty-state">Scanning your OneDrive storage for audio files…</div>
            ) : visibleTracks.length === 0 ? (
              <div className="empty-state">No audio files matched your search. Try signing in and refreshing the library.</div>
            ) : (
              <div className="track-list" role="list">
                {visibleTracks.map((track) => (
                  <article key={track.id} className={`track-row ${activeTrack?.id === track.id ? 'active' : ''}`}>
                    <div className="track-row__body">
                      <button className="icon-button" type="button" onClick={() => handleTrackSelect(track)}>
                        ▶
                      </button>
                      <div className="track-meta">
                        <span className="track-meta__title">{track.title}</span>
                        <span className="track-meta__artist">{track.artist} • {track.album}</span>
                      </div>
                    </div>
                    <div className="track-row__actions">
                      <span className="track-chip">{track.name}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="card queue-card">
            <div className="panel-head">
              <div>
                <p className="section-label">Queue</p>
                <h3>Up next</h3>
              </div>
            </div>
            {queue.length === 0 ? (
              <div className="empty-state">Your queue will appear here as soon as you start playing a track from OneDrive.</div>
            ) : (
              <div className="queue-list">
                {queue.map((track, index) => (
                  <div key={track.id} className="queue-item">
                    <div className="queue-item__meta">
                      <span className="queue-index">0{index + 1}</span>
                      <div>
                        <strong>{track.title}</strong>
                        <p>{track.artist}</p>
                      </div>
                    </div>
                    <button className="icon-button" type="button" onClick={() => handleTrackSelect(track)}>
                      ▶
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </section>
      </main>

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
