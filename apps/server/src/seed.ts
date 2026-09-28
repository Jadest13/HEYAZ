import { randomUUID } from 'node:crypto';
import {
  messageSchema,
  planSchema,
  profileSchema,
  usageSchema,
  type PlannedExercise,
} from '@heyaz/contracts';
import type { UserStore } from './db/store.js';
import { localDate } from './time.js';
const item = (
  exerciseId: PlannedExercise['exerciseId'],
  sets: number,
  reps: number,
  weight = 0,
): PlannedExercise => ({
  id: randomUUID(),
  exerciseId,
  sets,
  reps,
  weight,
  duration: 30,
  restSeconds: 60,
});
export async function seed(store: UserStore, now: Date) {
  if (await store.get('profile', 'current', profileSchema)) return;
  const profile = profileSchema.parse({
    name: '회원',
    goal: 'strength',
    height: 170,
    weight: 65,
    targetWeight: 65,
    experience: 'beginner',
    days: [1, 3, 5],
    minutes: 45,
    location: '헬스장',
    equipment: '덤벨, 바벨',
    excluded: '',
    notifications: false,
    onboarded: false,
    timeZone: 'Asia/Seoul',
    revision: 1,
  });
  await store.put('profile', 'current', profile);
  await store.put(
    'plan',
    'current',
    planSchema.parse({
      id: randomUUID(),
      name: '나만의 주간 루틴',
      startDate: localDate(now, profile.timeZone),
      goal: 'strength',
      createdBy: 'USER',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      revision: 1,
      days: [
        {
          id: randomUUID(),
          dayOfWeek: 1,
          startTime: '19:00',
          title: '상체 · 푸시 데이',
          estimatedDuration: 45,
          exercises: [
            item('bench', 3, 10, 20),
            item('incline', 3, 12, 8),
            item('shoulder', 3, 10, 6),
            item('lateral', 3, 12, 3),
            item('pushdown', 3, 12, 10),
          ],
        },
        {
          id: randomUUID(),
          dayOfWeek: 3,
          startTime: '19:00',
          title: '하체 & 코어',
          estimatedDuration: 35,
          exercises: [item('squat', 3, 15), item('lunge', 3, 10), item('plank', 3, 0)],
        },
        {
          id: randomUUID(),
          dayOfWeek: 5,
          startTime: '19:00',
          title: '등 & 전신',
          estimatedDuration: 40,
          exercises: [item('row', 3, 12, 8), item('pushup', 3, 10), item('jump', 3, 0)],
        },
      ],
    }),
  );
  if (!(await store.get('usage', 'current', usageSchema)))
    await store.put('usage', 'current', {
      free: { start: null, used: 0 },
      paid: { start: null, used: 0 },
      corrections: 0,
      canCorrect: false,
      timeZone: profile.timeZone,
    });
  const welcome = messageSchema.parse({
    id: randomUUID(),
    role: 'assistant',
    text: '반가워요! 운동 목표나 가능한 시간을 알려주세요. 현재 코치 연결 상태는 서버 설정에 따라 달라집니다.',
    components: [
      { type: 'CHOICE', options: ['30분 계획', '운동 기록 분석', '체력 확인할 운동 추천'] },
    ],
    createdAt: now.toISOString(),
  });
  await store.put('message', welcome.id, welcome);
}
