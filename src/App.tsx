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
  const [isSettingsOpen, setSettingsOpen] = useState(false);

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
    setSettingsOpen(false);
    library.reset();
    player.reset();
    await auth.signOut();
  }, [auth, library, player]);

  const handleHome = useCallback(() => {
    library.setViewMode('songs');
    sheet.close();
    setSettingsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [library, sheet]);

  // Close settings automatically once a user-triggered sync starts streaming tracks.
  const pendingSyncCloseRef = useRef(false);
  const handleSync = useCallback(() => {
    pendingSyncCloseRef.current = true;
    void library.sync();
  }, [library]);

  useEffect(() => {
    if (pendingSyncCloseRef.current && library.tracks.length > 0) {
      pendingSyncCloseRef.current = false;
      setSettingsOpen(false);
    }
  }, [library.tracks.length]);

  // On first sign-in with an empty library, open Settings so the user can pick a folder.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!account) {
      autoOpenedRef.current = false;
      return;
    }
    if (!autoOpenedRef.current && !isLoading && !hasLibraryContent) {
      autoOpenedRef.current = true;
      setSettingsOpen(true);
    }
  }, [account, isLoading, hasLibraryContent]);

  let dockPad = 28;
  if (account) {
    dockPad = 96;
    if (activeTrack) {
      dockPad += 72;
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
          ) : (
            <Library
              isLoading={isLoading}
              viewMode={library.viewMode}
              tracks={library.tracks}
              visibleTracks={library.visibleTracks}
              albumGroups={library.albumGroups}
              visibleDownloaded={library.visibleDownloaded}
              folderPath={library.folderPath}
              activeTrackId={activeTrackId}
              isPlaying={player.isPlaying}
              isDownloaded={downloads.isDownloaded}
              isDownloading={downloads.isDownloading}
              onSelect={player.playTrack}
              onDownload={downloads.downloadTrack}
              onRemoveDownload={downloads.removeDownload}
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
              viewMode={library.viewMode}
              downloadedCount={downloads.downloadedTracks.length}
              onViewModeChange={library.setViewMode}
              searchTerm={library.searchTerm}
              onSearchChange={library.setSearchTerm}
              onHome={handleHome}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </Dock>
        ) : null}

        {account ? (
          <Settings
            isOpen={isSettingsOpen}
            onClose={() => setSettingsOpen(false)}
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
            isDownloaded={downloads.isDownloaded(activeTrack.id)}
            isDownloading={downloads.isDownloading(activeTrack.id)}
            onClose={sheet.close}
            onSeek={player.seek}
            onToggle={player.togglePlayback}
            onNext={player.playNext}
            onPrevious={player.playPrevious}
            onVolumeChange={player.changeVolume}
            onDownload={() => downloads.downloadTrack(activeTrack)}
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
