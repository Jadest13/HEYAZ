import type { AppState, PlannedExercise } from '../types';
import { localDate, uid } from '../utils/date';
import { demoRecords } from './records';
const item = (exerciseId: string, sets: number, reps: number, weight = 0): PlannedExercise => ({
  id: uid(),
  exerciseId,
  sets,
  reps,
  weight,
  duration: 30,
  restSeconds: 60,
});
export function initialState(): AppState {
  const now = new Date().toISOString();
  const state: AppState = {
    version: 1,
    profile: {
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
    },
    plan: {
      id: uid(),
      name: '나만의 주간 루틴',
      startDate: localDate(),
      goal: 'strength',
      createdBy: 'USER',
      createdAt: now,
      updatedAt: now,
      revision: 1,
      days: [
        {
          id: uid(),
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
          id: uid(),
          dayOfWeek: 3,
          startTime: '19:00',
          title: '하체 & 코어',
          estimatedDuration: 35,
          exercises: [item('squat', 3, 15), item('lunge', 3, 10), item('plank', 3, 0)],
        },
        {
          id: uid(),
          dayOfWeek: 5,
          startTime: '19:00',
          title: '등 & 전신',
          estimatedDuration: 40,
          exercises: [item('row', 3, 12, 8), item('pushup', 3, 10), item('jump', 3, 0)],
        },
      ],
    },
    sessions: [],
    metrics: [],
    burning: [],
    messages: [
      {
        id: uid(),
        role: 'assistant',
        text: '반가워요! 꾸준히 이어갈 수 있는 운동을 함께 만들어봐요. 목표나 오늘 운동할 수 있는 시간을 알려주세요.',
        components: [
          {
            type: 'CHOICE',
            options: ['계획 만들기', '운동 추가하기', '내 기록을 분석해줘'],
          },
        ],
      },
    ],
  };
  return fillDemoData(state);
}

export function fillDemoData(state: AppState): AppState {
  if (state.demoDataVersion === 1) return state;
  const demo = demoRecords(state);
  return {
    ...state,
    demoDataVersion: 1,
    sessions: state.sessions.length ? state.sessions : demo.sessions,
    metrics: state.metrics.length ? state.metrics : demo.metrics,
    burning: state.burning.length ? state.burning : demo.burning,
  };
}
