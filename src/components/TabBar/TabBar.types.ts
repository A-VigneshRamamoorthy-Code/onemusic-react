import type { ViewMode } from '../../types';

export interface TabBarProps {
  hasLibraryContent: boolean;
  viewMode: ViewMode;
  downloadedCount: number;
  onViewModeChange: (mode: ViewMode) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onHome: () => void;
  onOpenSettings: () => void;
}
