import { useNavigate } from 'react-router-dom';
import { UserRound, LogOut } from 'lucide-react';
import { useApp } from '@heyaz/app/hooks/useApp';
import {
  Button,
  Card,
  Stack,
  Grid,
  Between,
  Muted,
  Tag,
} from '@heyaz/app/components/common/ui.web';
import { goalLabels } from '@heyaz/app/constants/exercises';
export function MyPage({
  loggedIn,
  onLogin,
  onLogout,
}: {
  loggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const { state } = useApp();
  const navigate = useNavigate();
  if (!loggedIn)
    return (
      <Card>
        <h1>마이페이지</h1>
        <p>로그인하고 나의 프로필과 운동 기록을 확인하세요.</p>
        <Button onClick={onLogin}>로그인</Button>
      </Card>
    );
  return (
    <Stack>
      <Between>
        <div>
          <Tag>MY PAGE</Tag>
          <h1 style={{ marginTop: 14 }}>나의 운동 여정</h1>
        </div>
        <Button variant="ghost" onClick={onLogout}>
          <LogOut size={16} />
          로그아웃
        </Button>
      </Between>
      <Card>
        <UserRound size={32} />
        <h2 style={{ marginTop: 16 }}>{state.profile.name}님</h2>
        <Muted>임시 계정 · {goalLabels[state.profile.goal]}</Muted>
        <p>내 페이스에 맞춰 꾸준히 이어가세요.</p>
        <Button onClick={() => navigate('/profile')}>프로필 수정</Button>
      </Card>
      <Grid>
        {[
          ['완료한 운동', `${state.sessions.filter((s) => s.status === 'completed').length}회`],
          ['신체 측정', `${state.metrics.length}일`],
        ].map(([label, value]) => (
          <Card key={label}>
            <Muted>{label}</Muted>
            <h2 style={{ marginTop: 12 }}>{value}</h2>
          </Card>
        ))}
      </Grid>
      <Card>
        <h2>나의 기록과 설정</h2>
        <Between>
          <Button variant="ghost" onClick={() => navigate('/history')}>
            운동 기록
          </Button>
          <Button variant="ghost" onClick={() => navigate('/body')}>
            신체 변화
          </Button>
          <Button variant="ghost" onClick={() => navigate('/plan')}>
            운동 계획
          </Button>
          <Button variant="ghost" onClick={() => navigate('/settings')}>
            설정
          </Button>
        </Between>
      </Card>
      <Muted>
        임시 로그인은 현재 탭에서만 유지됩니다. 로그아웃해도 기기에 저장된 운동 기록은 유지됩니다.
      </Muted>
    </Stack>
  );
}
