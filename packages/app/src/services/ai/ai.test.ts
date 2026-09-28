import { expect, it } from 'vitest';
import { initialState } from '../../mocks/initial';
import { MockAICoachService } from './index';
import { applyPlan } from '../../domain';
import { coachAllowance } from '../../domain/coachPolicy';
const service = new MockAICoachService();
it('inserts the named exercise between the requested neighbors', async () => {
  const state = initialState();
  const reply = await service.reply('월요일 벤치프레스 뒤에 플랭크 추가해줘', state);
  const component = reply.components.find((c) => c.type === 'PLAN_CHANGE');
  if (component?.type !== 'PLAN_CHANGE') throw new Error('Expected proposal');
  expect(component.proposal.presentation).toBe('change');
  expect(component.proposal.after.days[0].exercises.slice(0, 3).map((e) => e.exerciseId)).toEqual([
    'bench',
    'plank',
    'incline',
  ]);
});
it('creates a single-day proposal while preserving every other day', async () => {
  const state = initialState();
  const reply = await service.reply('수요일 하루 20분 계획 만들어줘', state);
  const component = reply.components.find((c) => c.type === 'PLAN_CHANGE');
  if (component?.type !== 'PLAN_CHANGE') throw new Error('Expected proposal');
  expect(component.proposal.presentation).toBe('day');
  expect(component.proposal.focusWeekday).toBe(3);
  expect(component.proposal.after.days.filter((d) => d.dayOfWeek !== 3)).toEqual(
    state.plan.days.filter((d) => d.dayOfWeek !== 3),
  );
  expect(component.proposal.after.days.find((d) => d.dayOfWeek === 3)?.estimatedDuration).toBe(20);
});
it('adds an exercise without replacing existing days and applies only on approval', async () => {
  const state = initialState();
  const original = JSON.stringify(state.plan);
  const reply = await service.reply('운동 추가하기', state);
  const component = reply.components.find((c) => c.type === 'PLAN_CHANGE');
  if (component?.type !== 'PLAN_CHANGE') throw new Error('Expected exercise proposal');
  expect(JSON.stringify(state.plan)).toBe(original);
  const next = component.proposal.after;
  expect(next.days[0].exercises.slice(0, -1)).toEqual(state.plan.days[0].exercises);
  expect(next.days[0].exercises.at(-1)?.exerciseId).toBe('walk');
  expect(next.days.slice(1)).toEqual(state.plan.days.slice(1));
  expect(applyPlan(state, next, 1).plan.days[0].exercises).toHaveLength(
    state.plan.days[0].exercises.length + 1,
  );
});
it('returns a valid plan for the create-plan shortcut', async () => {
  const state = initialState();
  const reply = await service.reply('계획 만들기', state);
  const component = reply.components.find((c) => c.type === 'PLAN_CHANGE');
  if (component?.type !== 'PLAN_CHANGE') throw new Error('Expected plan proposal');
  expect(() => applyPlan(state, component.proposal.after, 1)).not.toThrow();
});
it('understands a named cardio exercise and adds it to the requested weekday', async () => {
  const state = initialState();
  const reply = await service.reply('수요일에 빠르게 걷기 추가해줘', state);
  const component = reply.components.find((c) => c.type === 'PLAN_CHANGE');
  if (component?.type !== 'PLAN_CHANGE') throw new Error('Expected exercise proposal');
  expect(
    component.proposal.after.days.find((d) => d.dayOfWeek === 3)?.exercises.at(-1)?.exerciseId,
  ).toBe('walk');
  expect(component.proposal.after.days[0]).toEqual(state.plan.days[0]);
});
it('uses assessment values without changing the plan until approval', async () => {
  const state = initialState();
  const before = JSON.stringify(state.plan);
  state.assessments = [
    {
      id: 'test',
      date: '2026-09-08',
      summary: '테스트',
      records: [
        {
          id: 'bench-test',
          exerciseId: 'bench',
          sets: 2,
          reps: 10,
          weight: 20,
          duration: 30,
          restSeconds: 60,
        },
      ],
    },
  ];
  const reply = await service.reply('체력 검사 기록으로 계획을 만들어줘', state);
  expect(JSON.stringify(state.plan)).toBe(before);
  const component = reply.components.find((c) => c.type === 'PLAN_CHANGE');
  if (component?.type !== 'PLAN_CHANGE') throw new Error('Expected proposal');
  expect(component.proposal.after.days[0].exercises[0].weight).toBe(14);
  expect(component.proposal.after.days[0].exercises[0].reps).toBe(7);
  expect(
    applyPlan(state, component.proposal.after, component.proposal.baseRevision).plan.revision,
  ).toBe(2);
});
it('blocks unrelated text without a workout plan proposal', async () => {
  const reply = await service.reply('주식 추천해줘', initialState());
  expect(reply.outcome).toBe('off-topic');
  expect(reply.components).toEqual([]);
});
it('uses a short duration answer after clarification', async () => {
  const state = initialState();
  state.coachUsage = coachAllowance(state).usage;
  state.coachUsage.canCorrect = true;
  const reply = await service.reply('20', state);
  const component = reply.components.find((c) => c.type === 'PLAN_CHANGE');
  expect(
    component?.type === 'PLAN_CHANGE' && component.proposal.after.days[0].estimatedDuration,
  ).toBe(20);
});
