import styled from 'styled-components';
import { rise } from '../../styles/keyframes';

export const Player = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 7px;
  border-radius: 22px;
  border: 1px solid var(--border-default);
  background: var(--neutral-primary-soft);
  background: color-mix(in srgb, var(--neutral-primary-soft) 68%, transparent);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  backdrop-filter: blur(28px) saturate(1.6);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: ${rise} var(--dur) var(--ease-out) both;
`;

export const Bar = styled.span`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  background: var(--neutral-secondary-medium);
`;

export const BarFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(90deg, var(--brand), var(--brand-strong));
  transition: width 200ms linear;
`;

export const Art = styled.span`
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border-radius: 11px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
`;

export const Meta = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

export const Title = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Sub = styled.span`
  font-size: 11px;
  color: var(--body-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Expand = styled.span`
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  color: var(--body-subtle);
  padding: 0 2px;
`;

export const Open = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 3px;
  border-radius: var(--radius-default);
  text-align: left;
  transition: background var(--dur-quick);

  &:hover {
    background: var(--neutral-secondary-medium);
  }
  &:hover ${Expand} {
    color: var(--fg-brand);
  }
`;

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
`;
