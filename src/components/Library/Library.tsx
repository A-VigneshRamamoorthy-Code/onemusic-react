import { memo, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AlbumGroup, AlbumGroups } from '../AlbumGroup';
import { Button } from '../Button';
import { Placeholder } from '../Placeholder';
import { ScanBanner, TrackList, TrackRow } from '../TrackRow';
import { IconChevronLeft, IconDownload } from '../Icon';
import { folderLabel } from '../../utils/tracks';
import type { Track } from '../../types';
import type { LibraryProps } from './Library.types';
import * as S from './Library.style';

function LibraryInner({
  isLoading,
  viewMode,
  tracks,
  visibleTracks,
  albumGroups,
  visibleDownloaded,
  downloadedCount,
  folderPath,
  activeTrackId,
  isPlaying,
  isDownloaded,
  isDownloading,
  onSelect,
  onDownload,
  onDownloadAll,
  onRemoveDownload,
  onRemoveAllDownloads,
}: LibraryProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAlbum(null);
  }, [viewMode]);

  const renderRow = (track: Track, index: number) => (
    <TrackRow
      key={track.id}
      track={track}
      index={index}
      isActive={activeTrackId === track.id}
      isActivePlaying={activeTrackId === track.id && isPlaying}
      isDownloaded={isDownloaded(track.id)}
      isDownloading={isDownloading(track.id)}
      onSelect={onSelect}
      onDownload={onDownload}
      onRemoveDownload={onRemoveDownload}
    />
  );

  const scanBanner = <>Still scanning {folderLabel(folderPath)} — tap any track to play now.</>;
  const emptyMessage = <>No tracks yet — open Settings, choose a folder under "My files" and tap Sync.</>;
  const scanningMessage = <>Scanning {folderLabel(folderPath)} for audio files…</>;

  const title = isLoading
    ? 'Scanning…'
    : viewMode === 'downloaded'
      ? 'Offline'
      : tracks.length
        ? `${tracks.length} track${tracks.length === 1 ? '' : 's'}`
        : 'Your library';

  let content: ReactNode;
  if (viewMode === 'downloaded') {
    content =
      visibleDownloaded.length > 0 ? (
        <TrackList>{visibleDownloaded.map(renderRow)}</TrackList>
      ) : (
        <Placeholder artSeed="offline-empty">
          No downloaded music yet. Tap the download icon on any track to save it for offline — it stays available after
          you close the tab.
        </Placeholder>
      );
  } else if (viewMode === 'albums') {
    if (selectedAlbum) {
      const group = albumGroups.find((g) => g.album === selectedAlbum);
      content = group ? (
        <>
          <S.DetailHeader>
            <S.BackBtn type="button" onClick={() => setSelectedAlbum(null)} aria-label="Back to albums">
              <IconChevronLeft size={18} />
              Albums
            </S.BackBtn>
            <S.DetailAlbum>{group.album}</S.DetailAlbum>
            <S.DetailCount>{group.tracks.length} track{group.tracks.length === 1 ? '' : 's'}</S.DetailCount>
          </S.DetailHeader>
          <TrackList>{group.tracks.map(renderRow)}</TrackList>
        </>
      ) : null;
    } else {
      content =
        albumGroups.length > 0 ? (
          <>
            {isLoading ? <ScanBanner>{scanBanner}</ScanBanner> : null}
            <AlbumGroups>
              {albumGroups.map((group) => (
                <AlbumGroup
                  key={group.album}
                  album={group.album}
                  count={group.tracks.length}
                  artSeed={group.tracks[0].id}
                  onPlay={() => onSelect(group.tracks[0])}
                  onToggle={() => setSelectedAlbum(group.album)}
                />
              ))}
            </AlbumGroups>
          </>
        ) : isLoading ? (
          <Placeholder spinner>{scanningMessage}</Placeholder>
        ) : (
          <Placeholder artSeed="empty-state">{emptyMessage}</Placeholder>
        );
    }
  } else {
    content =
      visibleTracks.length > 0 ? (
        <TrackList>
          {isLoading ? <ScanBanner as="li">{scanBanner}</ScanBanner> : null}
          {visibleTracks.map(renderRow)}
        </TrackList>
      ) : isLoading ? (
        <Placeholder spinner>{scanningMessage}</Placeholder>
      ) : (
        <Placeholder artSeed="empty-state">{emptyMessage}</Placeholder>
      );
  }

  return (
    <S.Section>
      <S.Head>
        <S.Title>{title}</S.Title>
        {viewMode === 'songs' && tracks.length > 0 ? (
          <S.HeaderAction>
            <Button variant="secondary" size="sm" onClick={onDownloadAll} disabled={isLoading}>
              <IconDownload size={16} /> Download all
            </Button>
          </S.HeaderAction>
        ) : viewMode === 'downloaded' && downloadedCount > 0 ? (
          <S.HeaderAction>
            <Button variant="ghost" size="sm" onClick={onRemoveAllDownloads}>
              Remove all
            </Button>
          </S.HeaderAction>
        ) : null}
      </S.Head>
      {content}
    </S.Section>
  );
}

export const Library = memo(LibraryInner);
