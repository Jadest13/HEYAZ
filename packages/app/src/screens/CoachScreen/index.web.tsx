import { useCoach } from '../../hooks/useCoach';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { typography as t } from '@heyaz/app/styles/typography';
import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { colors as c } from '../../styles';
import { Send, Sparkles } from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import { Button, Card, Between, Row, Stack, Muted, Tag } from '../../components/common/ui.web';
import { applyPlan } from '../../domain';
import { PlanProposal } from '../../components/exercise/PlanProposal.web';

import type { AIComponent } from '../../types';
const ChatLayout = styled(Stack)`
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;
const Conversation = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 320px;
  max-height: calc(100dvh - 390px);
  overflow-y: auto;
  padding: 8px 8px 20px;
  overscroll-behavior: contain;
  @media (max-width: 760px) {
    max-height: 55dvh;
  }
`;
const Bubble = styled.div<{ user: boolean }>`
  max-width: calc(100% - 44px);
  align-self: ${(p) => (p.user ? 'flex-end' : 'flex-start')};
  background: ${(p) => (p.user ? c.accentSoft : c.surface)};
  border: 1px solid ${(p) => (p.user ? c.accentBorder : c.border)};
  border-radius: ${(p) => (p.user ? '18px 18px 4px 18px' : '18px 18px 18px 4px')};
  padding: 12px 16px;
  overflow-wrap: anywhere;
  @media (max-width: 760px) {
    max-width: 100%;
    padding: 14px;
  }
`;
const Composer = styled.textarea`
  resize: vertical;
  min-height: 54px;
  max-height: 180px;
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  padding: 12px;
  color: ${c.text};
  font: inherit;
  line-height: 1.6;
`;

export function DynamicUIRenderer({
  component,
  onChoice,
}: {
  component: AIComponent;
  onChoice: (s: string) => void;
}) {
  const { state, update } = useApp();
  const [error, setError] = useState('');
  if (component.type === 'CHOICE')
    return (
      <Row>
        {component.options.map((o) => (
          <Button key={o} variant="soft" onClick={() => onChoice(o)}>
            {o}
          </Button>
        ))}
      </Row>
    );
  if (component.type === 'INSIGHT') return <Muted>{component.text}</Muted>;
  const proposal = component.proposal;
  const finish = (status: 'applied' | 'rejected') => {
    try {
      const next =
        status === 'applied' ? applyPlan(state, proposal.after, proposal.baseRevision) : state;
      update(() => ({
        ...next,
        messages: next.messages.map((m) => ({
          ...m,
          components: m.components.map((c) =>
            c.type === 'PLAN_CHANGE' && c.proposal.id === proposal.id
              ? { ...c, proposal: { ...c.proposal, status } }
              : c,
          ),
        })),
      }));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return <PlanProposal proposal={proposal} error={error} onFinish={finish} />;
}
export function CoachScreen() {
  const { state } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(params.get('prompt') ?? '');
  const { send: sendRequest, busy, error, allowance } = useCoach();
  const conversation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = conversation.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [state.messages.length, busy]);
  const send = async (text: string) => {
    if (await sendRequest(text)) setInput('');
  };
  return (
    <ChatLayout>
      <Between>
        <div>
          <h1>
            <Sparkles size={26} /> AI 코치
          </h1>
          <Muted>당신의 페이스에 맞춰, 함께 만드는 운동.</Muted>
        </div>
        <Tag>데모 코치</Tag>
      </Between>
      <Row>
        <Muted>
          남은 이용 {allowance.remaining}/{allowance.limit}회
          {allowance.freeCorrection
            ? ' · 무료 수정 ' + (3 - allowance.usage.corrections) + '회 가능'
            : ''}
        </Muted>
        <Button variant="ghost" onClick={() => navigate('/assessment')}>
          체력 확인
        </Button>
      </Row>
      <Row>
        <Button variant="soft" disabled={busy} onClick={() => void send('계획 만들기')}>
          <Sparkles size={16} />
          계획 만들기
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void send('운동 추가하기')}>
          운동 추가하기
        </Button>
      </Row>
      <Conversation ref={conversation} role="log" aria-label="코치와의 대화" aria-live="polite">
        {state.messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
            }}
          >
            {m.role === 'assistant' && (
              <span
                aria-label="AI 코치"
                style={{
                  flex: '0 0 34px',
                  height: 34,
                  borderRadius: '50%',
                  background: c.accentSoft,
                  color: c.accent,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Sparkles size={18} />
              </span>
            )}
            <Bubble user={m.role === 'user'}>
              <p style={{ lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{m.text}</p>
              {m.components.map((component, i) => (
                <DynamicUIRenderer
                  key={i}
                  component={component}
                  onChoice={(text) => void send(text)}
                />
              ))}
            </Bubble>
          </div>
        ))}
        {busy && <Muted role="status">코치가 답변을 준비하고 있어요…</Muted>}
      </Conversation>
      {error && <p role="alert">{error}</p>}
      <Card style={{ padding: 12 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Row style={{ flexWrap: 'nowrap', alignItems: 'end' }}>
            <Composer
              aria-label="코치에게 메시지"
              placeholder="오늘은 30분만 운동할 수 있어요…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
            />
            <Button disabled={busy || !input.trim()} type="submit" aria-label="메시지 보내기">
              <Send size={18} />
            </Button>
          </Row>
        </form>
        <Muted style={{ display: 'block', fontSize: t.caption, padding: '4px 12px' }}>
          Enter로 전송 · Shift+Enter로 줄바꿈
        </Muted>
      </Card>
      <Muted style={{ textAlign: 'center', fontSize: t.caption }}>
        현재는 규칙 기반 데모입니다. 실제 AI API는 연결되지 않았습니다.
      </Muted>
    </ChatLayout>
  );
}
