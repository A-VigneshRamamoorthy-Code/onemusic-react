import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { IconAlbum, IconClose, IconDownload, IconHome, IconList, IconSearch, IconSettings } from '../Icon';
import type { TabBarProps } from './TabBar.types';
import * as S from './TabBar.style';

/**
 * Floating dock of equally sized, evenly spaced icons: Home, the Songs/Albums/Offline
 * views, Settings and Search. Tapping Search swaps the icons for a search field with a
 * Close button; Close restores the icons.
 */
export function TabBar({
  hasLibraryContent,
  viewMode,
  downloadedCount,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  onHome,
  onOpenSettings,
}: TabBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setIsSearchOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    if (searchTerm) {
      onSearchChange('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      closeSearch();
    }
  };

  if (isSearchOpen) {
    return (
      <S.Bar>
        <S.IconBtn type="button" $fixed onClick={onHome} aria-label="Home">
          <IconHome size={22} />
        </S.IconBtn>
        <S.Search>
          <S.SearchIcon aria-hidden="true">
            <IconSearch size={18} />
          </S.SearchIcon>
          <S.Input
            ref={inputRef}
            type="search"
            value={searchTerm}
            placeholder="Songs, artists, albums…"
            aria-label="Search your library"
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </S.Search>
        <S.IconBtn type="button" $fixed onClick={closeSearch} aria-label="Close search">
          <IconClose size={22} />
        </S.IconBtn>
      </S.Bar>
    );
  }

  return (
    <S.Bar>
      <S.IconBtn type="button" onClick={onHome} aria-label="Home">
        <IconHome size={22} />
      </S.IconBtn>

      {hasLibraryContent ? (
        <>
          <S.IconBtn
            type="button"
            $active={viewMode === 'songs'}
            aria-label="Songs"
            aria-pressed={viewMode === 'songs'}
            onClick={() => onViewModeChange('songs')}
          >
            <IconList size={22} />
          </S.IconBtn>
          <S.IconBtn
            type="button"
            $active={viewMode === 'albums'}
            aria-label="Albums"
            aria-pressed={viewMode === 'albums'}
            onClick={() => onViewModeChange('albums')}
          >
            <IconAlbum size={22} />
          </S.IconBtn>
          <S.IconBtn
            type="button"
            $active={viewMode === 'downloaded'}
            aria-label={`Offline${downloadedCount ? ` (${downloadedCount})` : ''}`}
            aria-pressed={viewMode === 'downloaded'}
            onClick={() => onViewModeChange('downloaded')}
          >
            <IconDownload size={22} />
            {downloadedCount ? <S.Badge>{downloadedCount}</S.Badge> : null}
          </S.IconBtn>
        </>
      ) : null}

      <S.IconBtn type="button" onClick={onOpenSettings} aria-label="Settings">
        <IconSettings size={22} />
      </S.IconBtn>

      {hasLibraryContent ? (
        <S.IconBtn type="button" onClick={openSearch} aria-label="Search">
          <IconSearch size={22} />
        </S.IconBtn>
      ) : null}
    </S.Bar>
  );
}
