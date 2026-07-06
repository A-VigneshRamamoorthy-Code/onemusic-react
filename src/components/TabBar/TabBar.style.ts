import styled from 'styled-components';
import { fadeIn, rise } from '../../styles/keyframes';

export const Bar = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border-radius: 28px;
  border: 1px solid var(--border-default);
  background: var(--neutral-primary-soft);
  background: color-mix(in srgb, var(--neutral-primary-soft) 68%, transparent);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  backdrop-filter: blur(28px) saturate(1.6);
  box-shadow: var(--shadow-lg);
  animation: ${rise} var(--dur) var(--ease-out) both;
`;

/** Sliding highlight pill that animates to the active view icon. */
export const Indicator = styled.span`
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  z-index: 0;
  border-radius: var(--radius-full);
  background: var(--brand-softer);
  opacity: 0;
  pointer-events: none;
  transition: transform var(--dur) var(--ease-out), width var(--dur) var(--ease-out), opacity var(--dur-quick);
`;

/** Equal-width, equal-height dock icon. Every item shares the same footprint. */
export const IconBtn = styled.button<{ $active?: boolean; $fixed?: boolean }>`
  position: relative;
  z-index: 1;
  flex: ${(props) => (props.$fixed ? '0 0 50px' : '1 1 0')};
  min-width: 0;
  height: 50px;
  border-radius: var(--radius-full);
  display: inline-grid;
  place-items: center;
  color: ${(props) => (props.$active ? 'var(--fg-brand)' : 'var(--heading)')};
  background: transparent;
  transition: color var(--dur-quick), transform var(--dur-quick);

  &:hover {
    color: var(--fg-brand);
  }
  &:active {
    transform: scale(0.9);
  }

  & svg {
    display: block;
  }
`;

export const Search = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 50px;
  padding: 0 16px;
  border-radius: var(--radius-full);
  background: var(--neutral-secondary-medium);
  transition: box-shadow var(--dur-quick);
  animation: ${fadeIn} var(--dur-quick) var(--ease-out) both;

  &:focus-within {
    box-shadow: 0 0 0 1px var(--brand);
  }
`;

export const SearchIcon = styled.span`
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  color: var(--body-subtle);
`;

export const Input = styled.input`
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  font-size: 15px;
  color: var(--heading);

  &::placeholder {
    color: var(--body-subtle);
  }
  &:focus-visible {
    box-shadow: none;
  }
`;
