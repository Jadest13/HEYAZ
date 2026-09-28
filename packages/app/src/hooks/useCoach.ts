import { useRef, useState } from 'react';
import { useApp } from './useApp';
import { MockAICoachService } from '../services/ai';
import { chargeCoach, coachAllowance } from '../domain/coachPolicy';
import { uid } from '../utils/date';
const coach = new MockAICoachService();
export function useCoach() {
  const { state, update } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const send = async (text: string) => {
    if (!text.trim() || pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const usage = chargeCoach(state);
      const reply = await coach.reply(text, state);
      usage.canCorrect = reply.outcome === 'off-topic' || reply.outcome === 'clarification';
      update((s) => ({
        ...s,
        coachUsage: usage,
        messages: [
          ...s.messages,
          { id: uid(), role: 'user', text: text.trim(), components: [] },
          reply,
        ],
      }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : '메시지를 보내지 못했습니다.');
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { send, busy, error, allowance: coachAllowance(state) };
}
