import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GlobalStyle } from './styles/GlobalStyle';
import { AppHeader } from './components/AppHeader';
import { Dock } from './components/Dock';
import { Hero } from './components/Hero';
import { Library } from './components/Library';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlaying } from './components/NowPlaying';
import { Settings } from './components/Settings';
import { TabBar } from './components/TabBar';
import { useAuth } from './hooks/useAuth';
import { useDownloads } from './hooks/useDownloads';
import { useLibrary } from './hooks/useLibrary';
import { useMediaSession } from './hooks/useMediaSession';
import { useNowPlayingSheet } from './hooks/useNowPlayingSheet';
import { usePlayer } from './hooks/usePlayer';
import { useTheme } from './hooks/useTheme';
import type { Track } from './types';
import * as S from './App.style';

export default function App() {
  const [status, setStatus] = useState('Sign in with Microsoft to browse your OneDrive music library.');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [page, setPage] = useState<'library' | 'settings'>('library');

  const theme = useTheme();
  const auth = useAuth({ setStatus, setIsLoading });
  const downloads = useDownloads({ ensureAccessToken: auth.ensureAccessToken, setStatus });
  const library = useLibrary({
    account: auth.account,
    ensureAccessToken: auth.ensureAccessToken,
    setStatus,
    setIsLoading,
    downloadedTracks: downloads.downloadedTracks,
    setActiveTrackId,
  });
  const player = usePlayer({
    ensureAccessToken: auth.ensureAccessToken,
    orderedTracks: library.orderedTracks,
    activeTrackId,
    setActiveTrackId,
    setStatus,
  });
  const sheet = useNowPlayingSheet();

  const activeTrack = useMemo<Track | null>(
    () =>
      library.tracks.find((track) => track.id === activeTrackId) ||
      downloads.downloadedTracks.find((track) => track.id === activeTrackId) ||
      null,
    [activeTrackId, library.tracks, downloads.downloadedTracks],
  );

  useMediaSession({
    activeTrack,
    isPlaying: player.isPlaying,
    playNext: player.playNext,
    playPrevious: player.playPrevious,
    resume: player.resume,
    pause: player.pause,
    seek: player.seek,
  });

  const { account } = auth;
  const hasLibraryContent = library.tracks.length > 0 || downloads.downloadedTracks.length > 0;

  const handleSignOut = useCallback(async () => {
    setPage('library');
    library.reset();
    player.reset();
    await auth.signOut();
  }, [auth, library, player]);

  const handleHome = useCallback(() => {
    setPage('library');
    library.setViewMode('songs');
    sheet.close();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [library, sheet]);

  const handleSelectView = useCallback(
    (mode: 'songs' | 'albums' | 'downloaded') => {
      setPage('library');
      library.setViewMode(mode);
    },
    [library],
  );

  const handleOpenSettings = useCallback(() => {
    setPage('settings');
    sheet.close();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sheet]);

  const handleDownloadBatchFromActive = useCallback(async () => {
    const activeId = activeTrackId;
    const playlist = library.orderedTracks;
    if (!activeId || !playlist.length) {
      return;
    }
    const startIndex = playlist.findIndex((track) => track.id === activeId);
    if (startIndex === -1) {
      return;
    }
    const max = playlist.length;
    const raw = window.prompt(`How many songs should be downloaded? (1-${max})`, '1');
    if (raw === null) {
      return;
    }
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setStatus('Please enter a valid number of songs.');
      return;
    }
    const count = Math.min(max, parsed);
    const toDownload: Track[] = [];
    for (let offset = 0; offset < count; offset += 1) {
      const track = playlist[(startIndex + offset) % max];
      if (track) {
        toDownload.push(track);
      }
    }
    const pending = toDownload.filter((track) => !downloads.isDownloaded(track.id) && !downloads.isDownloading(track.id));
    if (!pending.length) {
      setStatus('Those songs are already downloaded or in progress.');
      return;
    }
    for (const track of pending) {
      // Sequential keeps status and token usage predictable on mobile browsers.
      // eslint-disable-next-line no-await-in-loop
      await downloads.downloadTrack(track);
    }
  }, [activeTrackId, downloads, library.orderedTracks]);

  const handleDownloadAll = useCallback(async () => {
    const pending = library.tracks.filter(
      (track) => !downloads.isDownloaded(track.id) && !downloads.isDownloading(track.id),
    );
    if (!pending.length) {
      setStatus('All library songs are already downloaded or in progress.');
      return;
    }
    setStatus(`Downloading ${pending.length} song${pending.length === 1 ? '' : 's'}…`);
    for (const track of pending) {
      // Download sequentially to avoid saturating mobile connections and storage.
      // eslint-disable-next-line no-await-in-loop
      await downloads.downloadTrack(track);
    }
    setStatus(`Finished downloading ${pending.length} song${pending.length === 1 ? '' : 's'}.`);
  }, [downloads, library.tracks, setStatus]);

  // Return to the library automatically once a user-triggered sync starts streaming tracks.
  const pendingSyncCloseRef = useRef(false);
  const handleSync = useCallback(() => {
    pendingSyncCloseRef.current = true;
    void library.sync();
  }, [library]);

  useEffect(() => {
    if (pendingSyncCloseRef.current && library.tracks.length > 0) {
      pendingSyncCloseRef.current = false;
      setPage('library');
    }
  }, [library.tracks.length]);

  // On first sign-in with an empty library, show the Settings page so the user can pick a folder.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!account) {
      autoOpenedRef.current = false;
      return;
    }
    if (!autoOpenedRef.current && !isLoading && !hasLibraryContent) {
      autoOpenedRef.current = true;
      setPage('settings');
    }
  }, [account, isLoading, hasLibraryContent]);

  let dockPad = 24;
  if (account) {
    dockPad = 90;
    if (activeTrack) {
      dockPad += 58;
    }
  }

  return (
    <>
      <GlobalStyle />
      <S.AppShell $dockPad={dockPad}>
        <AppHeader account={account} onSignIn={auth.signIn} />

        <S.Main>
          {!account ? (
            <Hero authState={auth.authState} status={status} onSignIn={auth.signIn} />
          ) : page === 'settings' ? (
            <Settings
              account={account}
              folderPath={library.folderPath}
              isLoading={isLoading}
              status={status}
              onFolderPathChange={library.setFolderPath}
              onSync={handleSync}
              onRefresh={library.refresh}
              accents={theme.accents}
              accentId={theme.accentId}
              onSelectAccent={theme.setAccent}
              onSignOut={handleSignOut}
            />
          ) : (
            <Library
              isLoading={isLoading}
              viewMode={library.viewMode}
              tracks={library.tracks}
              visibleTracks={library.visibleTracks}
              albumGroups={library.albumGroups}
              visibleDownloaded={library.visibleDownloaded}
              downloadedCount={downloads.downloadedTracks.length}
              folderPath={library.folderPath}
              activeTrackId={activeTrackId}
              isPlaying={player.isPlaying}
              isDownloaded={downloads.isDownloaded}
              isDownloading={downloads.isDownloading}
              onSelect={player.playTrack}
              onDownload={downloads.downloadTrack}
              onDownloadAll={handleDownloadAll}
              onRemoveDownload={downloads.removeDownload}
              onRemoveAllDownloads={downloads.removeAllDownloads}
            />
          )}
        </S.Main>

        {account ? (
          <Dock>
            {activeTrack ? (
              <MiniPlayer
                track={activeTrack}
                isPlaying={player.isPlaying}
                progress={player.progress}
                duration={player.duration}
                onOpen={sheet.open}
                onToggle={player.togglePlayback}
                onNext={player.playNext}
              />
            ) : null}
            <TabBar
              hasLibraryContent={hasLibraryContent}
              activeTab={page === 'settings' ? 'settings' : library.viewMode}
              onViewModeChange={handleSelectView}
              onOpenSettings={handleOpenSettings}
              searchTerm={library.searchTerm}
              onSearchChange={library.setSearchTerm}
              onHome={handleHome}
            />
          </Dock>
        ) : null}

        {activeTrack ? (
          <NowPlaying
            track={activeTrack}
            isOpen={sheet.isOpen}
            isDragging={sheet.isDragging}
            dragY={sheet.dragY}
            isPlaying={player.isPlaying}
            progress={player.progress}
            duration={player.duration}
            volume={player.volume}
            isShuffleOn={player.isShuffleOn}
            isDownloaded={downloads.isDownloaded(activeTrack.id)}
            isDownloading={downloads.isDownloading(activeTrack.id)}
            onClose={sheet.close}
            onSeek={player.seek}
            onToggle={player.togglePlayback}
            onNext={player.playNext}
            onPrevious={player.playPrevious}
            onVolumeChange={player.changeVolume}
            onToggleShuffle={player.toggleShuffle}
            onDownload={handleDownloadBatchFromActive}
            onRemoveDownload={() => downloads.removeDownload(activeTrack)}
            onPointerDown={sheet.handlePointerDown}
            onPointerMove={sheet.handlePointerMove}
            onPointerUp={sheet.handlePointerUp}
          />
        ) : null}

        <audio
          ref={player.audioRef}
          preload="metadata"
          onLoadedMetadata={player.handleTimeUpdate}
          onTimeUpdate={player.handleTimeUpdate}
          onEnded={player.playNext}
          onPause={player.handlePause}
          onPlay={player.handlePlay}
          onError={player.handleError}
        />
      </S.AppShell>
    </>
  );
}
