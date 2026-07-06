import styled from 'styled-components';
import { fadeIn, rise } from '../../styles/keyframes';

export const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
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

export const Round = styled.button`
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  color: var(--heading);
  background: var(--neutral-secondary-medium);
  transition: background var(--dur-quick), color var(--dur-quick), transform var(--dur-quick);

  &:hover {
    background: var(--neutral-tertiary-medium);
    color: var(--fg-brand);
  }
  &:active {
    transform: scale(0.92);
  }
`;

export const Middle = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  animation: ${fadeIn} var(--dur-quick) var(--ease-out) both;
`;

export const Spacer = styled.span`
  flex: 1;
  min-width: 0;
`;

export const Search = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
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
