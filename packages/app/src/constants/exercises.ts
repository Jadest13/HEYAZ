import type { Exercise } from '../types';
export const exercises: Exercise[] = [
  { id: 'bench', name: '벤치프레스', muscle: '가슴', equipment: '바벨', kind: 'strength', met: 5 },
  {
    id: 'incline',
    name: '인클라인 덤벨 프레스',
    muscle: '가슴',
    equipment: '덤벨',
    kind: 'strength',
    met: 5,
  },
  {
    id: 'shoulder',
    name: '덤벨 숄더 프레스',
    muscle: '어깨',
    equipment: '덤벨',
    kind: 'strength',
    met: 5,
  },
  {
    id: 'lateral',
    name: '사이드 레터럴 레이즈',
    muscle: '어깨',
    equipment: '덤벨',
    kind: 'strength',
    met: 4,
  },
  {
    id: 'pushdown',
    name: '케이블 푸시다운',
    muscle: '삼두',
    equipment: '케이블',
    kind: 'strength',
    met: 4,
  },
  { id: 'squat', name: '스쿼트', muscle: '하체', equipment: '맨몸', kind: 'strength', met: 5 },
  { id: 'row', name: '덤벨 로우', muscle: '등', equipment: '덤벨', kind: 'strength', met: 5 },
  { id: 'lunge', name: '런지', muscle: '하체', equipment: '맨몸', kind: 'strength', met: 5 },
  { id: 'pushup', name: '푸시업', muscle: '가슴', equipment: '맨몸', kind: 'strength', met: 5 },
  { id: 'plank', name: '플랭크', muscle: '코어', equipment: '맨몸', kind: 'timed', met: 3 },
  { id: 'jump', name: '팔 벌려 뛰기', muscle: '전신', equipment: '맨몸', kind: 'timed', met: 7 },
];
const targets: Record<string, string[]> = {
  bench: ['대흉근', '삼두근', '전면 삼각근'],
  incline: ['상부 대흉근', '전면 삼각근', '삼두근'],
  shoulder: ['전면·측면 삼각근', '삼두근'],
  lateral: ['측면 삼각근'],
  pushdown: ['삼두근'],
  squat: ['대퇴사두근', '둔근', '코어'],
  row: ['광배근', '능형근', '이두근'],
  lunge: ['대퇴사두근', '둔근', '햄스트링'],
  pushup: ['대흉근', '삼두근', '코어'],
  plank: ['복직근', '복횡근', '둔근'],
  jump: ['종아리', '대퇴사두근', '어깨'],
};
exercises.forEach((exercise) => {
  exercise.targets = targets[exercise.id];
  exercise.cardio = exercise.id === 'jump';
});
exercises.push(
  {
    id: 'walk',
    name: '빠르게 걷기',
    muscle: '하체',
    equipment: '맨몸',
    kind: 'timed',
    met: 4,
    cardio: true,
    targets: ['둔근', '대퇴사두근', '종아리'],
  },
  {
    id: 'run',
    name: '가벼운 러닝',
    muscle: '하체',
    equipment: '맨몸',
    kind: 'timed',
    met: 7,
    cardio: true,
    targets: ['대퇴사두근', '햄스트링', '종아리', '코어'],
  },
  {
    id: 'cycle',
    name: '실내 자전거',
    muscle: '하체',
    equipment: '자전거',
    kind: 'timed',
    met: 6,
    cardio: true,
    targets: ['대퇴사두근', '둔근', '종아리'],
  },
);
export const exerciseById = (id: string, custom: Exercise[] = []) =>
  [...exercises, ...custom].find((e) => e.id === id) ?? exercises[0];
export const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
export const goalLabels = {
  strength: '근력 향상',
  'fat-loss': '체지방 감량',
  fitness: '건강한 습관',
};
