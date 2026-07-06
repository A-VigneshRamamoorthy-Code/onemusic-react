import styled from 'styled-components';

export const AppShell = styled.div<{ $dockPad: number }>`
  max-width: 960px;
  margin: 0 auto;
  padding: calc(14px + env(safe-area-inset-top)) 16px calc(${(props) => props.$dockPad}px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;

  @media (min-width: 768px) {
    padding: calc(20px + env(safe-area-inset-top)) 24px calc(${(props) => props.$dockPad}px + env(safe-area-inset-bottom));
    gap: 22px;
  }
`;

export const Main = styled.main`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (min-width: 768px) {
    gap: 22px;
  }
`;
