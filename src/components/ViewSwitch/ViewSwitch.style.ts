import styled, { css } from 'styled-components';

export const Switch = styled.div`
  display: flex;
  flex: 0 1 auto;
  min-width: 0;
  gap: 3px;
  padding: 4px;
  border-radius: var(--radius-full);
  background: var(--neutral-secondary-medium);
`;

export const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 7px 10px;
  border-radius: var(--radius-full);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--body);
  white-space: nowrap;
  flex: ${(props) => (props.$active ? '0 1 auto' : '0 0 auto')};
  transition: background var(--dur-quick), color var(--dur-quick);

  & svg {
    flex: 0 0 auto;
  }
  & span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  ${(props) =>
    props.$active
      ? css`
          background: var(--neutral-primary-soft);
          color: var(--fg-brand);
          box-shadow: var(--shadow-xs);
        `
      : css`
          &:hover {
            color: var(--heading);
          }
        `}
`;
