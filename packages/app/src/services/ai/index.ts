import { clone } from '@heyaz/app/utils/clone';
import type { AIMessage, AppState } from '../../types';
import { planSchema } from '../../schemas';
import { uid } from '../../utils/date';
import { volume } from '../../domain';
import { classifyQuestion } from '../../domain/coachPolicy';
import { exercises, exerciseById, weekdays } from '../../constants/exercises';
export interface AICoachService {
  reply(message: string, context: AppState): Promise<AIMessage>;
}
export class MockAICoachService implements AICoachService {
  async reply(text: string, state: AppState): Promise<AIMessage> {
    const base = { id: uid(), role: 'assistant' as const };
    const outcome = classifyQuestion(text, state.coachUsage?.canCorrect);
    if (outcome !== 'answer')
      return {
        ...base,
        outcome,
        text:
          outcome === 'off-topic'
            ? '운동과 관련된 질문만 도와드릴 수 있어요. 운동 목표나 가능한 시간을 다시 알려주세요.'
            : '어떤 운동을 어떻게 조정하고 싶으세요? 가능한 시간이나 목표를 알려주세요.',
        components: [],
      };
    if (/체력/.test(text) && /추천|확인할/.test(text))
      return {
        ...base,
        text: '편안한 범위의 푸시업·스쿼트·플랭크를 선택해 실제 수행 결과를 기록해보세요. 체력 확인 화면에서 운동을 교체하거나 중량 운동을 추가할 수 있어요. 한계까지 수행할 필요는 없습니다.',
        components: [],
      };
    if (state.coachUsage?.canCorrect && /^\s*\d+\s*$/.test(text)) text = `${text.trim()}분 계획`;
    if (/추가/.test(text)) {
      const after = clone(state.plan);
      const weekday = weekdays.findIndex((day) => text.includes(`${day}요일`));
      if (weekday >= 0 && !after.days.some((d) => d.dayOfWeek === weekday))
        return {
          ...base,
          outcome: 'clarification',
          text: `${weekdays[weekday]}요일에는 아직 루틴이 없어요. 먼저 해당 요일 계획을 만들어주세요.`,
          components: [],
        };
      const day = after.days.find((d) => d.dayOfWeek === weekday) ?? after.days[0];
      const mentions = exercises
        .filter((e) => text.includes(e.name))
        .sort((a, b) => text.indexOf(a.name) - text.indexOf(b.name));
      if (!mentions.length && !/^(운동\s*추가하기|운동\s*추가해줘|운동\s*추가)$/.test(text.trim()))
        return {
          ...base,
          outcome: 'clarification',
          text: '추가할 운동 이름을 목록에서 확인해주세요. 예: 플랭크, 빠르게 걷기, 스쿼트. 요일과 앞뒤 운동도 함께 알려주시면 그 위치에 넣어드려요.',
          components: [],
        };
      const requested =
        mentions.find((e) =>
          /^(?:을|를)?\s*추가/.test(text.slice(text.indexOf(e.name) + e.name.length)),
        ) ??
        mentions.find((e) => !day.exercises.some((item) => item.exerciseId === e.id)) ??
        mentions.at(-1);
      const excluded = state.profile.excluded.toLowerCase();
      const available = exercises.filter(
        (e) => !excluded.includes(e.id) && !excluded.includes(e.name.toLowerCase()),
      );
      const exercise = requested ?? available.find((e) => e.id === 'walk') ?? available[0];
      if (!exercise || !available.includes(exercise))
        return {
          ...base,
          outcome: 'clarification',
          text: '피하고 싶은 운동에 포함되어 있어요. 다른 운동 이름을 알려주세요.',
          components: [],
        };
      if (day.exercises.some((e) => e.exerciseId === exercise.id))
        return {
          ...base,
          text: `${weekdays[day.dayOfWeek]}요일에는 이미 ${exercise.name}이 있어요. 추가할 다른 운동이나 요일을 알려주세요.`,
          components: [
            {
              type: 'CHOICE',
              options: ['수요일에 빠르게 걷기 추가해줘', '금요일에 플랭크 추가해줘'],
            },
          ],
        };
      const timed = exercise.kind === 'timed';
      let insertion = day.exercises.length;
      for (const anchor of mentions.filter((e) => e.id !== exercise.id)) {
        const suffix = text.slice(text.indexOf(anchor.name) + anchor.name.length);
        const index = day.exercises.findIndex((e) => e.exerciseId === anchor.id);
        if (index < 0) continue;
        if (/^\s*(뒤|후|다음)/.test(suffix)) {
          insertion = index + 1;
          break;
        }
        if (/^\s*(앞|전)/.test(suffix)) {
          insertion = index;
          break;
        }
        if (/사이/.test(text) && mentions.length >= 3) {
          insertion = index + 1;
          break;
        }
      }
      day.exercises.splice(insertion, 0, {
        id: uid(),
        exerciseId: exercise.id,
        sets: timed ? 1 : 3,
        reps: timed ? 0 : 12,
        weight: 0,
        duration: exercise.cardio ? 600 : 30,
        restSeconds: timed ? 0 : 60,
      });
      day.estimatedDuration = Math.min(300, day.estimatedDuration + (exercise.cardio ? 10 : 5));
      after.createdBy = 'AI';
      return {
        ...base,
        text: `${weekdays[day.dayOfWeek]}요일에 ${exercise.name} 추가를 제안해요. 위치를 확인하고 적용해주세요.`,
        components: [
          {
            type: 'PLAN_CHANGE',
            proposal: {
              presentation: 'change',
              focusWeekday: day.dayOfWeek,
              id: uid(),
              baseRevision: state.plan.revision,
              before: clone(state.plan),
              after: planSchema.parse(after),
              status: 'pending',
              reason: `${exercise.name} 추가 · ${(exercise.targets ?? [exercise.muscle]).join(', ')} 자극${exercise.cardio ? ` · 체중 ${state.profile.weight}kg 기준으로 예상 소모량을 표시해요.` : ''}`,
            },
          },
        ],
      };
    }
    if (/체력|분|계획|루틴|강도|줄|늘|수정|변경/.test(text)) {
      const after = clone(state.plan);
      const requestedWeekday = weekdays.findIndex((day) => text.includes(`${day}요일`));
      const oneDay = /오늘|하루/.test(text) || requestedWeekday >= 0;
      const focusWeekday = requestedWeekday >= 0 ? requestedWeekday : new Date().getDay();
      const modification = /수정|변경|줄|늘|조정|바꿔/.test(text);
      const match = text.match(/(\d+)\s*분/);
      const minutes = match ? Math.max(10, Math.min(120, Number(match[1]))) : state.profile.minutes;
      after.createdBy = 'AI';
      if (!oneDay && !modification) after.name = `${state.profile.name}님의 ${minutes}분 루틴`;
      const proposedDays = (
        oneDay
          ? [focusWeekday]
          : modification
            ? state.plan.days.map((d) => d.dayOfWeek)
            : state.profile.days
      ).map((day, i) => ({
        ...clone(
          state.plan.days.find((d) => d.dayOfWeek === day) ??
            state.plan.days[i % state.plan.days.length],
        ),
        id: state.plan.days.find((d) => d.dayOfWeek === day)?.id ?? uid(),
        dayOfWeek: day,
        estimatedDuration: minutes,
      }));
      proposedDays.forEach((day) => {
        day.exercises = day.exercises.filter((e) => {
          const excluded = state.profile.excluded.toLowerCase();
          return (
            !excluded.includes(e.exerciseId) &&
            !excluded.includes(exerciseById(e.exerciseId).name.toLowerCase())
          );
        });
        const count = Math.max(1, Math.floor(minutes / 8));
        day.exercises = day.exercises.slice(0, count);
        day.exercises.forEach((e) => {
          e.sets = minutes <= 30 ? 2 : 3;
        });
      });
      const assessment = state.assessments?.at(-1);
      if (assessment && /체력|검사/.test(text))
        proposedDays.forEach((day) => {
          day.exercises = assessment.records.map((record) => ({
            ...record,
            id: uid(),
            sets: Math.min(3, Math.max(1, record.sets)),
            reps: record.reps ? Math.max(1, Math.floor(record.reps * 0.7)) : 0,
            duration: Math.max(5, Math.floor(record.duration * 0.7)),
            weight: record.weight ? Math.floor(record.weight * 0.7 * 2) / 2 : 0,
          }));
        });
      after.days = oneDay
        ? [...after.days.filter((d) => d.dayOfWeek !== focusWeekday), ...proposedDays].sort(
            (a, b) => a.dayOfWeek - b.dayOfWeek,
          )
        : proposedDays;
      const parsed = planSchema.parse(after);
      return {
        ...base,
        text: modification
          ? '바뀌는 부분만 모았어요. 확인하고 적용해주세요.'
          : oneDay
            ? `${weekdays[focusWeekday]}요일 ${minutes}분 계획이에요. 운동을 누르면 자세를 볼 수 있어요.`
            : `주 ${proposedDays.length}회, 회당 ${minutes}분 루틴이에요. 요일을 펼쳐 자세히 볼 수 있어요.`,
        components: [
          {
            type: 'PLAN_CHANGE',
            proposal: {
              presentation: modification ? 'change' : oneDay ? 'day' : 'week',
              focusWeekday: oneDay ? focusWeekday : undefined,
              id: uid(),
              baseRevision: state.plan.revision,
              before: state.plan,
              after: parsed,
              status: 'pending',
              reason:
                assessment && /체력|검사/.test(text)
                  ? '체력 확인에서 기록한 횟수·시간·중량의 약 70%를 시작점으로 제안합니다. 적용 전에 확인해주세요.'
                  : `운동 시간을 ${minutes}분으로 구성하고 세트 수를 조정합니다.`,
            },
          },
        ],
      };
    }
    const sessions = state.sessions.filter((s) => s.status !== 'active');
    return {
      ...base,
      text: sessions.length
        ? `저장된 운동 ${sessions.length}회, 총 볼륨 ${sessions.reduce((a, s) => a + volume(s), 0).toLocaleString()}kg을 확인했어요. 무리하게 중량을 올리기보다 계획한 횟수를 안정적으로 마치는 데 집중해보세요.`
        : '아직 완료된 운동 기록이 없어요. 계획에서 운동을 시작하거나 “30분으로 줄여줘”라고 입력해보세요.',
      components: [
        {
          type: 'INSIGHT',
          text: '현재는 로컬 데모 코치입니다. 실제 AI API는 아직 연결되지 않았습니다.',
        },
      ],
    };
  }
}
