import styled, { css } from 'styled-components';
import { breathe } from '../../styles/keyframes';

export const Art = styled.svg<{ $playing: boolean }>`
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: center;
  ${(props) =>
    props.$playing &&
    css`
      will-change: transform;
      animation: ${breathe} 4.5s ease-in-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
