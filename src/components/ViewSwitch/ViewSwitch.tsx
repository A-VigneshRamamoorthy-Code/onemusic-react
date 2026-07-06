import type { ReactElement } from 'react';
import { IconAlbum, IconDownload, IconList } from '../Icon';
import type { ViewMode } from '../../types';
import type { ViewSwitchProps } from './ViewSwitch.types';
import * as S from './ViewSwitch.style';

interface TabDef {
  mode: ViewMode;
  label: string;
  icon: ReactElement;
}

/** Songs/Albums/Offline switch. Only the active tab shows its label so it stays compact in the dock. */
export function ViewSwitch({ viewMode, downloadedCount, onChange }: ViewSwitchProps) {
  const tabs: TabDef[] = [
    { mode: 'songs', label: 'Songs', icon: <IconList size={16} /> },
    { mode: 'albums', label: 'Albums', icon: <IconAlbum size={16} /> },
    { mode: 'downloaded', label: `Offline${downloadedCount ? ` · ${downloadedCount}` : ''}`, icon: <IconDownload size={16} /> },
  ];

  return (
    <S.Switch role="tablist" aria-label="Library views">
      {tabs.map((tab) => {
        const active = viewMode === tab.mode;
        return (
          <S.Tab
            key={tab.mode}
            role="tab"
            type="button"
            aria-selected={active}
            aria-label={tab.label}
            $active={active}
            onClick={() => onChange(tab.mode)}
          >
            {tab.icon}
            {active ? <span>{tab.label}</span> : null}
          </S.Tab>
        );
      })}
    </S.Switch>
  );
}
