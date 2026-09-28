import { Temporal } from '@js-temporal/polyfill';
import { ApiError } from './errors.js';
export const localDate = (now: Date, timeZone: string) =>
  Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(timeZone).toPlainDate().toString();
export const addDays = (date: string, days: number) =>
  Temporal.PlainDate.from(date).add({ days }).toString();
export const weekday = (date: string) => Temporal.PlainDate.from(date).dayOfWeek % 7;
export const monday = (date: string) => addDays(date, -((weekday(date) + 6) % 7));
export function atLocal(date: string, time: string, timeZone: string) {
  try {
    return new Date(
      Temporal.PlainDateTime.from(`${date}T${time}`).toZonedDateTime(timeZone, {
        disambiguation: 'reject',
      }).epochMilliseconds,
    );
  } catch {
    throw new ApiError(
      422,
      'INVALID_LOCAL_TIME',
      '시간대 변경으로 존재하지 않거나 중복되는 시각입니다. 다른 시각을 선택해주세요.',
    );
  }
}
export function monthWindow(now: Date, timeZone: string) {
  const local = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(timeZone);
  const start = local.with({ day: 1 }).startOfDay();
  return {
    start: new Date(start.epochMilliseconds).toISOString(),
    next: new Date(start.add({ months: 1 }).epochMilliseconds).toISOString(),
  };
}
