import styled from 'styled-components';

export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 2px 2px 4px;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

export const Mark = styled.span`
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: var(--radius-full);
  display: grid;
  place-items: center;
  font-size: 20px;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: var(--shadow-sm);
`;

export const BrandText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const Eyebrow = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-brand);
`;

export const Title = styled.h1`
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: var(--heading);
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
