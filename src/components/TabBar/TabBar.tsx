import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { IconClose, IconHome, IconSearch, IconSettings } from '../Icon';
import { ViewSwitch } from '../ViewSwitch';
import type { TabBarProps } from './TabBar.types';
import * as S from './TabBar.style';

/**
 * Floating dock control bar. Menu mode shows Home + the Songs/Albums/Offline switch +
 * Settings, with a Search button at the end. Tapping Search swaps the menu for a search
 * field and turns the end button into Close.
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

  return (
    <S.Bar>
      <S.Round type="button" onClick={onHome} aria-label="Home">
        <IconHome size={20} />
      </S.Round>

      {isSearchOpen ? (
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
      ) : (
        <S.Middle>
          {hasLibraryContent ? (
            <ViewSwitch viewMode={viewMode} downloadedCount={downloadedCount} onChange={onViewModeChange} />
          ) : (
            <S.Spacer />
          )}
          <S.Round type="button" onClick={onOpenSettings} aria-label="Settings">
            <IconSettings size={20} />
          </S.Round>
        </S.Middle>
      )}

      {hasLibraryContent || isSearchOpen ? (
        isSearchOpen ? (
          <S.Round type="button" onClick={closeSearch} aria-label="Close search">
            <IconClose size={20} />
          </S.Round>
        ) : (
          <S.Round type="button" onClick={openSearch} aria-label="Search">
            <IconSearch size={20} />
          </S.Round>
        )
      ) : null}
    </S.Bar>
  );
}
