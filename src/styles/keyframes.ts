import { keyframes } from 'styled-components';

export const rise = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
`;

export const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: none; }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const vinyl = keyframes`
  to { transform: rotate(360deg); }
`;

export const eq = keyframes`
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
`;

export const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.055); }
`;

export const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: none; }
`;

export const sheen = keyframes`
  to { transform: rotate(360deg); }
`;
