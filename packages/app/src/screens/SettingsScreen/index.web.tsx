import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { Button, Card, Stack, Between, Muted, Title, Row } from '../../components/common/ui.web';
import { initialState } from '../../mocks/initial';
import { coachAllowance } from '../../domain/coachPolicy';
export function SettingsScreen() {
  const { state, update } = useApp();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const allowance = coachAllowance(state);
  return (
    <Stack>
      <h1>설정</h1>
      <Card>
        <Title>AI 코치 이용량</Title>
        <p>
          {state.paidPlan ? '유료 테스트' : '무료'} · 남은 횟수 {allowance.remaining} /{' '}
          {allowance.limit}회
        </p>
        <Muted>다음 갱신: {new Date(allowance.resetAt).toLocaleDateString('ko-KR')}</Muted>
        <p>무료: 첫 이용부터 15일마다 5회 · 유료: 매월 1일 100회</p>
        <Muted>
          운동 외 질문도 최초 전송은 1회로 계산합니다. 코치가 운동 외 질문으로 판단하거나 추가
          정보를 요청하면 후속 수정 3회까지 무료입니다. 오류로 응답을 받지 못한 요청은 차감하지
          않습니다.
        </Muted>
      </Card>
      <Card>
        <Title>테스트</Title>
        <Between style={{ marginTop: 20 }}>
          <div>
            <strong>유료 플랜</strong>
            <p>
              <Muted>실제 결제 없이 이용량 정책을 테스트합니다.</Muted>
            </p>
          </div>
          <Button
            role="switch"
            aria-checked={!!state.paidPlan}
            aria-label="유료 플랜 테스트"
            variant={state.paidPlan ? 'primary' : 'ghost'}
            onClick={() => update((s) => ({ ...s, paidPlan: !s.paidPlan }))}
          >
            {state.paidPlan ? 'ON' : 'OFF'}
          </Button>
        </Between>
        <Muted>플랜을 전환해도 각 플랜에서 사용한 횟수는 유지됩니다.</Muted>
        <Row style={{ marginTop: 24 }}>
          <Button variant="ghost" onClick={() => navigate('/design-system/typography')}>
            디자인 시스템
          </Button>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            데이터 초기화
          </Button>
        </Row>
        {confirm && (
          <div role="alert" style={{ marginTop: 20 }}>
            <p>
              이 기기의 운동 계획·기록·신체 측정·대화·체력 확인·이용량이 모두 초기화됩니다.
              계속할까요?
            </p>
            <Row>
              <Button
                variant="danger"
                onClick={() => {
                  update(() => initialState());
                  localStorage.removeItem('heyaz:plan-view');
                  sessionStorage.removeItem('heyaz:demo-login');
                  window.dispatchEvent(new Event('heyaz:reset'));
                  setConfirm(false);
                  setMessage('테스트 데이터를 초기화했습니다.');
                }}
              >
                모두 초기화
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                취소
              </Button>
            </Row>
          </div>
        )}
        <p role="status">{message}</p>
      </Card>
    </Stack>
  );
}
