import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const viewRefs = useRef<Partial<Record<ViewMode, HTMLButtonElement | null>>>({});

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

  // Position the sliding pill imperatively so switching tabs animates reliably (setting
  // the element's own transform/width lets the CSS transition run without a React churn).
  const positionIndicator = useCallback(() => {
    const indicator = indicatorRef.current;
    const button = viewRefs.current[viewMode];
    if (!indicator || !button) {
      return;
    }
    indicator.style.width = `${button.offsetWidth}px`;
    indicator.style.transform = `translateX(${button.offsetLeft}px)`;
    indicator.style.opacity = '1';
  }, [viewMode]);

  useLayoutEffect(() => {
    positionIndicator();
  }, [positionIndicator, hasLibraryContent, isSearchOpen]);

  useEffect(() => {
    window.addEventListener('resize', positionIndicator);
    return () => window.removeEventListener('resize', positionIndicator);
  }, [positionIndicator]);

  if (isSearchOpen) {
    return (
      <S.Bar>
        <S.IconBtn type="button" $fixed onClick={onHome} aria-label="Home">
          <IconHome size={26} />
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
          <IconClose size={26} />
        </S.IconBtn>
      </S.Bar>
    );
  }

  return (
    <S.Bar>
      {hasLibraryContent ? <S.Indicator ref={indicatorRef} aria-hidden="true" /> : null}

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
        <IconHome size={26} />
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
            <IconAlbum size={26} />
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
            <IconDownload size={26} />
          </S.IconBtn>
        </>
      ) : null}

      <S.IconBtn type="button" onClick={onOpenSettings} aria-label="Settings">
        <IconSettings size={26} />
      </S.IconBtn>

      {hasLibraryContent ? (
        <S.IconBtn type="button" onClick={openSearch} aria-label="Search">
          <IconSearch size={26} />
        </S.IconBtn>
      ) : null}
    </S.Bar>
  );
}
