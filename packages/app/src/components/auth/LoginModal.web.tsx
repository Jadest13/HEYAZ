import { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { X, UserRound } from 'lucide-react';
import { Button, Between, Muted, Stack, Tag } from '@heyaz/app/components/common/ui.web';
import { colors as c } from '@heyaz/app/styles/index';
const Dialog = styled.dialog`
  border: 1px solid ${c.border};
  border-radius: 24px;
  padding: 28px;
  background: ${c.surface};
  color: ${c.text};
  width: min(420px, calc(100% - 32px));
  max-height: 85dvh;
  overflow: auto;
  &::backdrop {
    background: ${c.overlay};
  }
`;
export function LoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <Dialog
      ref={ref}
      aria-labelledby="login-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <Stack>
        <Between>
          <Tag>WELCOME TO HEYAZ</Tag>
          <Button variant="ghost" onClick={onClose} aria-label="로그인 모달 닫기">
            <X size={16} />
          </Button>
        </Between>
        <div>
          <UserRound size={32} color={c.accent} />
          <h2 id="login-title" style={{ marginTop: 16 }}>
            나의 운동 여정을 이어가세요
          </h2>
          <Muted>지금은 임시 계정으로 마이페이지를 체험할 수 있어요.</Muted>
        </div>
        <Button onClick={onLogin}>임시 로그인</Button>
        <Muted style={{ textAlign: 'center' }}>소셜 로그인</Muted>
        {['카카오', '네이버', '구글'].map((name) => (
          <Button key={name} variant="ghost" disabled>
            {name} 로그인 · 준비 중
          </Button>
        ))}
        <Muted>소셜 계정 연결과 서버 인증은 준비 중입니다. 운동 기록은 이 기기에 보관됩니다.</Muted>
      </Stack>
    </Dialog>
  );
}
