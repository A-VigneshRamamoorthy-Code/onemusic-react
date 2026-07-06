import { Button } from '../Button';
import { IconMusic } from '../Icon';
import type { AppHeaderProps } from './AppHeader.types';
import * as S from './AppHeader.style';

export function AppHeader({ account, onSignIn }: AppHeaderProps) {
  return (
    <S.Header>
      <S.Brand>
        <S.Mark aria-hidden="true">
          <IconMusic size={22} />
        </S.Mark>
        <S.BrandText>
          <S.Title>OneMusic</S.Title>
        </S.BrandText>
      </S.Brand>
      {account ? null : (
        <S.Actions>
          <Button variant="brand" onClick={onSignIn}>
            Sign in
          </Button>
        </S.Actions>
      )}
    </S.Header>
  );
}
