import { expect, it } from 'vitest';
import { initialState } from '../mocks/initial';
import { clone } from '../utils/clone';
import { planChanges } from './planChanges';
it('reports inserted exercise neighbors without treating following exercises as moved', () => {
  const before = initialState().plan;
  const after = clone(before);
  after.days[0].exercises.splice(1, 0, { ...after.days[1].exercises[2], id: 'inserted' });
  const changes = planChanges(before, after);
  expect(changes).toHaveLength(1);
  expect(changes[0]).toMatchObject({
    kind: 'added',
    dayOfWeek: 1,
    beforeId: 'bench',
    afterId: 'incline',
  });
});
it('finds dose edits and removals, and returns no changes for identical plans', () => {
  const before = initialState().plan;
  const after = clone(before);
  expect(planChanges(before, after)).toEqual([]);
  after.days[0].exercises[0].weight = 22;
  after.days[1].exercises.pop();
  expect(planChanges(before, after).map((d) => d.kind)).toEqual(['updated', 'removed']);
});
