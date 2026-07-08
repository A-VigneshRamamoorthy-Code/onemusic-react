import styled from 'styled-components';
import { rise } from '../../styles/keyframes';

/** 2-column album grid container. */
export const Groups = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 12px;
  /* Prevent grid from overflowing its container. */
  min-width: 0;
  width: 100%;
`;

export const Card = styled.article`
  display: flex;
  flex-direction: column;
  gap: 7px;
  /* Required: without this grid items can expand beyond their 1fr column. */
  min-width: 0;
  animation: ${rise} var(--dur) var(--ease-out) both;
`;

export const ArtWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-base);
  overflow: hidden;
  box-shadow: var(--shadow-md);
`;

export const ArtBtn = styled.button`
  /* Fill the entire ArtWrap so the clickable area matches the art. */
  position: absolute;
  inset: 0;
  display: block;
  transition: transform var(--dur-quick) var(--ease);

  &:active {
    transform: scale(0.96);
  }
`;

export const PlayBtn = styled.button`
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: inline-grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.55);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: #fff;
  transition: transform var(--dur-quick), background var(--dur-quick);

  &:active {
    transform: scale(0.88);
    background: var(--brand);
  }
`;

export const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 2px;
`;

export const Title = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Count = styled.span`
  font-size: 11px;
  color: var(--body-subtle);
`;
