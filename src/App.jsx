import { useMemo, useState } from 'react';

const demoTracks = [
  {
    id: 'aurora',
    title: 'Aurora Drift',
    artist: 'Lina Vale',
    album: 'Midnight Bloom',
    duration: '3:24',
    mood: 'Dreamy',
  },
  {
    id: 'cinder',
    title: 'Cinder Glow',
    artist: 'Mika Rook',
    album: 'Velvet Echo',
    duration: '4:01',
    mood: 'Electric',
  },
  {
    id: 'moonlit',
    title: 'Moonlit Signal',
    artist: 'Noa Ell',
    album: 'Signal House',
    duration: '2:56',
    mood: 'Calm',
  },
  {
    id: 'north',
    title: 'Northbound',
    artist: 'Iris Quinn',
    album: 'Late Horizon',
    duration: '3:41',
    mood: 'Bright',
  },
];

function App() {
  const [activeTrackId, setActiveTrackId] = useState(demoTracks[0].id);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playlistIds, setPlaylistIds] = useState(['aurora', 'moonlit']);
  const [activeView, setActiveView] = useState('library');

  const activeTrack = useMemo(
    () => demoTracks.find((track) => track.id === activeTrackId) ?? demoTracks[0],
    [activeTrackId],
  );

  const visibleTracks = activeView === 'playlist'
    ? demoTracks.filter((track) => playlistIds.includes(track.id))
    : demoTracks;

  const togglePlayback = () => setIsPlaying((value) => !value);

  const addTrackToPlaylist = (trackId) => {
    setPlaylistIds((current) => (current.includes(trackId) ? current : [...current, trackId]));
  };

  return (
    <div className="app-shell">
      <header className="topbar card">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            ♫
          </div>
          <div>
            <p className="section-label">React soundtrack</p>
            <h1>OneMusic</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button secondary" type="button">
            Preview playlist
          </button>
          <button className="button brand" type="button">
            Launch app
          </button>
        </div>
      </header>

      <main className="content-stack">
        <section className="hero card">
          <div className="hero-copy">
            <p className="section-label">Designed for flow</p>
            <h2>Your music, sculpted into a calm and cinematic experience.</h2>
            <p className="text-lead">
              OneMusic combines expressive visuals, fast browsing, and a touch-friendly player for a richer listening experience.
            </p>
            <div className="button-row">
              <button className="button brand" type="button">
                Start listening
              </button>
              <button className="button secondary" type="button">
                View library
              </button>
            </div>
            <div className="hero-stats" aria-label="product highlights">
              <div>
                <strong>24/7</strong>
                <span>immersive playlists</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>listener delight</span>
              </div>
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-preview__art" aria-hidden="true" />
            <div className="player-card">
              <div className="player-card__meta">
                <p className="section-label">Now playing</p>
                <h3>{activeTrack.title}</h3>
                <p>{activeTrack.artist} • {activeTrack.album}</p>
              </div>
              <div className="timeline-row">
                <span>1:22</span>
                <input type="range" defaultValue="34" aria-label="Playback progress" />
                <span>3:24</span>
              </div>
              <div className="player-card__controls">
                <button className="icon-button" type="button" aria-label="Previous track">
                  ⏮
                </button>
                <button className="icon-button-large button brand" type="button" onClick={togglePlayback}>
                  {isPlaying ? '❚❚' : '▶'}
                </button>
                <button className="icon-button" type="button" aria-label="Next track">
                  ⏭
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-grid">
          <article className="card feature-card">
            <div className="feature-icon">✦</div>
            <h3>Smart playlists</h3>
            <p>Build curated flows for focus, chill, and late-night listening in a single tap.</p>
          </article>
          <article className="card feature-card">
            <div className="feature-icon">◎</div>
            <h3>Immersive art</h3>
            <p>Surface album-inspired visuals and animated transitions that feel as rich as the soundtrack.</p>
          </article>
          <article className="card feature-card">
            <div className="feature-icon">⟳</div>
            <h3>Fluid controls</h3>
            <p>Scrub the timeline, adjust volume, and switch tracks without breaking your rhythm.</p>
          </article>
        </section>

        <section className="library-grid">
          <div className="card library-card">
            <div className="panel-head">
              <div>
                <p className="section-label">Library</p>
                <h3>Pick your next song</h3>
              </div>
              <div className="pill-row" role="tablist" aria-label="library views">
                <button
                  className={`nav-chip ${activeView === 'library' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveView('library')}
                >
                  Library
                </button>
                <button
                  className={`nav-chip ${activeView === 'playlist' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveView('playlist')}
                >
                  Playlist
                </button>
              </div>
            </div>

            <div className="track-list" role="list">
              {visibleTracks.map((track) => (
                <article key={track.id} className={`track-row ${activeTrackId === track.id ? 'active' : ''}`}>
                  <div className="track-row__body">
                    <button className="icon-button" type="button" onClick={() => setActiveTrackId(track.id)}>
                      ▶
                    </button>
                    <div className="track-meta">
                      <span className="track-meta__title">{track.title}</span>
                      <span className="track-meta__artist">{track.artist} • {track.album}</span>
                    </div>
                  </div>
                  <div className="track-row__actions">
                    <span className="track-chip">{track.mood}</span>
                    <button className="icon-button" type="button" onClick={() => addTrackToPlaylist(track.id)}>
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="card queue-card">
            <div className="panel-head">
              <div>
                <p className="section-label">Queue</p>
                <h3>Ready to play</h3>
              </div>
            </div>
            <div className="queue-list">
              {playlistIds.map((trackId, index) => {
                const track = demoTracks.find((candidate) => candidate.id === trackId);
                if (!track) return null;
                return (
                  <div key={track.id} className="queue-item">
                    <div className="queue-item__meta">
                      <span className="queue-index">0{index + 1}</span>
                      <div>
                        <strong>{track.title}</strong>
                        <p>{track.artist}</p>
                      </div>
                    </div>
                    <span className="track-chip">{track.duration}</span>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default App;
