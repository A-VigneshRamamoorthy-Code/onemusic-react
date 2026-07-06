import type { ViewMode } from '../../types';

export interface TabBarProps {
  hasLibraryContent: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onHome: () => void;
  onOpenSettings: () => void;
}
