import { describe, expect, it } from 'vitest';
import { chargeCoach, coachAllowance, classifyQuestion } from './coachPolicy';
import { initialState } from '../mocks/initial';
const now = new Date('2026-09-08T12:00:00').getTime();
describe('coach allowance', () => {
  it('limits free requests to five and renews exactly fifteen days later', () => {
    let state = initialState();
    for (let i = 0; i < 5; i++) state = { ...state, coachUsage: chargeCoach(state, now) };
    expect(() => chargeCoach(state, now + 1)).toThrow();
    expect(coachAllowance(state, now + 15 * 86400000 - 1).remaining).toBe(0);
    expect(coachAllowance(state, now + 15 * 86400000).remaining).toBe(5);
  });
  it('allows only three free corrections even when normal allowance is exhausted', () => {
    let state = initialState();
    for (let i = 0; i < 5; i++) state = { ...state, coachUsage: chargeCoach(state, now) };
    state.coachUsage!.canCorrect = true;
    for (let i = 0; i < 3; i++) {
      state.coachUsage = chargeCoach(state, now);
      state.coachUsage.canCorrect = true;
    }
    expect(state.coachUsage!.free.used).toBe(5);
    expect(() => chargeCoach(state, now)).toThrow();
  });
  it('retains both usage buckets when switching plans and renews paid monthly', () => {
    const state = initialState();
    state.coachUsage = chargeCoach(state, now);
    state.paidPlan = true;
    for (let i = 0; i < 100; i++) state.coachUsage = chargeCoach(state, now);
    expect(() => chargeCoach(state, now)).toThrow();
    state.paidPlan = false;
    expect(coachAllowance(state, now).remaining).toBe(4);
    state.paidPlan = true;
    expect(coachAllowance(state, new Date('2026-10-01T00:00:00').getTime()).remaining).toBe(100);
  });
  it('does not give free corrections after an ordinary answer', () => {
    const state = initialState();
    state.coachUsage = chargeCoach(state, now);
    expect(coachAllowance(state, now).freeCorrection).toBe(false);
  });
  it('blocks off-topic requests and understands short clarification answers', () => {
    expect(classifyQuestion('주식 추천해줘')).toBe('off-topic');
    expect(classifyQuestion('운동 추천해줘')).toBe('clarification');
    expect(classifyQuestion('20', true)).toBe('answer');
    expect(classifyQuestion('20', false)).toBe('off-topic');
  });
});
