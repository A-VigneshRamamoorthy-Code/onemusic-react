import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { IconAlbum, IconClose, IconDownload, IconHome, IconSearch, IconSettings } from '../Icon';
import type { ViewMode } from '../../types';
import type { TabBarProps } from './TabBar.types';
import * as S from './TabBar.style';

/**
 * Floating dock of equally sized, evenly spaced icons: Home (the songs/library view),
 * Albums, Offline, Settings and Search. A highlight pill slides to the active view.
 * Tapping Search swaps the icons for a search field with a Close button.
 */
export function TabBar({
  hasLibraryContent,
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  onHome,
  onOpenSettings,
}: TabBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewRefs = useRef<Partial<Record<ViewMode, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

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

  const positionIndicator = () => {
    if (isSearchOpen || !hasLibraryContent) {
      setIndicator(null);
      return;
    }
    const button = viewRefs.current[viewMode];
    if (button) {
      setIndicator({ left: button.offsetLeft, width: button.offsetWidth });
    }
  };

  useLayoutEffect(positionIndicator, [viewMode, isSearchOpen, hasLibraryContent]);

  useEffect(() => {
    window.addEventListener('resize', positionIndicator);
    return () => window.removeEventListener('resize', positionIndicator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, isSearchOpen, hasLibraryContent]);

  if (isSearchOpen) {
    return (
      <S.Bar>
        <S.IconBtn type="button" $fixed onClick={onHome} aria-label="Home">
          <IconHome size={24} />
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
          <IconClose size={24} />
        </S.IconBtn>
      </S.Bar>
    );
  }

  return (
    <S.Bar>
      {indicator ? (
        <S.Indicator aria-hidden="true" style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} />
      ) : null}

      <S.IconBtn
        ref={(element) => {
          viewRefs.current.songs = element;
        }}
        type="button"
        $active={viewMode === 'songs'}
        aria-label="Home"
        aria-pressed={viewMode === 'songs'}
        onClick={onHome}
      >
        <IconHome size={24} />
      </S.IconBtn>

      {hasLibraryContent ? (
        <>
          <S.IconBtn
            ref={(element) => {
              viewRefs.current.albums = element;
            }}
            type="button"
            $active={viewMode === 'albums'}
            aria-label="Albums"
            aria-pressed={viewMode === 'albums'}
            onClick={() => onViewModeChange('albums')}
          >
            <IconAlbum size={24} />
          </S.IconBtn>
          <S.IconBtn
            ref={(element) => {
              viewRefs.current.downloaded = element;
            }}
            type="button"
            $active={viewMode === 'downloaded'}
            aria-label="Offline"
            aria-pressed={viewMode === 'downloaded'}
            onClick={() => onViewModeChange('downloaded')}
          >
            <IconDownload size={24} />
          </S.IconBtn>
        </>
      ) : null}

      <S.IconBtn type="button" onClick={onOpenSettings} aria-label="Settings">
        <IconSettings size={24} />
      </S.IconBtn>

      {hasLibraryContent ? (
        <S.IconBtn type="button" onClick={openSearch} aria-label="Search">
          <IconSearch size={24} />
        </S.IconBtn>
      ) : null}
    </S.Bar>
  );
}
