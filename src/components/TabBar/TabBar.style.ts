import styled from 'styled-components';
import { fadeIn, rise } from '../../styles/keyframes';

export const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border-radius: 26px;
  border: 1px solid var(--border-default);
  background: var(--neutral-primary-soft);
  background: color-mix(in srgb, var(--neutral-primary-soft) 66%, transparent);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  backdrop-filter: blur(28px) saturate(1.6);
  box-shadow: var(--shadow-lg);
  animation: ${rise} var(--dur) var(--ease-out) both;
`;

/** Equal-width, equal-height dock icon. Every item shares the same footprint. */
export const IconBtn = styled.button<{ $active?: boolean; $fixed?: boolean }>`
  position: relative;
  flex: ${(props) => (props.$fixed ? '0 0 46px' : '1 1 0')};
  min-width: 0;
  height: 46px;
  border-radius: var(--radius-full);
  display: inline-grid;
  place-items: center;
  color: ${(props) => (props.$active ? 'var(--fg-brand)' : 'var(--heading)')};
  background: ${(props) => (props.$active ? 'var(--brand-softer)' : 'transparent')};
  transition: background var(--dur-quick), color var(--dur-quick), transform var(--dur-quick);

  &:hover {
    background: ${(props) => (props.$active ? 'var(--brand-soft)' : 'var(--neutral-secondary-medium)')};
    color: ${(props) => (props.$active ? 'var(--fg-brand)' : 'var(--fg-brand)')};
  }
  &:active {
    transform: scale(0.9);
  }

  & svg {
    display: block;
  }
`;

export const Badge = styled.span`
  position: absolute;
  top: 5px;
  left: 55%;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--neutral-primary-soft);
`;

export const Search = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 14px;
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
