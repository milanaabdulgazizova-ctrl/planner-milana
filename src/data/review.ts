import { addDays, startOfWeek, todayISO } from '../lib/dates';
import { weekdayIndex } from '../lib/repeat';
import { db, type Task } from './db';
import { alive } from './records';
import { compareTasks, tasksForDates } from './tasks';

/** Сколько дней назад смотрим на пропущенные повторы (обычные задачи — без ограничения). */
const REPEAT_LOOKBACK_DAYS = 7;

/**
 * Невыполненное для вечернего разбора: задачи с датой сегодня и раньше.
 * Обычные задачи — все, повторы — за последние дни с прошлого разбора (но не больше недели).
 */
export async function reviewItems(lastReviewDate: string): Promise<Task[]> {
  const today = todayISO();
  const real = alive(await db.tasks.filter((t) => !!t.date && t.date <= today && !t.done && !t.repeat && !t.skipped).toArray());
  let from = addDays(today, -(REPEAT_LOOKBACK_DAYS - 1));
  if (lastReviewDate && addDays(lastReviewDate, 1) > from) from = addDays(lastReviewDate, 1);
  const dates: string[] = [];
  for (let d = from; d <= today; d = addDays(d, 1)) dates.push(d);
  const virtual = (await tasksForDates(dates)).filter((t) => t.virtual);
  return [...real, ...virtual].sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : compareTasks(a, b)));
}

/**
 * Какую неделю планируем, если сегодня день планирования (или следующий за ним):
 * планирование в понедельник — текущая неделя, в любой другой день — следующая.
 */
export function planningTargetWeek(planningDay: number, today = todayISO()): string {
  const planningDate = weekdayIndex(today) === planningDay ? today : addDays(today, -1);
  return planningDay === 0 ? startOfWeek(planningDate) : startOfWeek(addDays(planningDate, 7));
}

/** Пора ли напомнить о планировании: в день планирования и на следующий, если ещё не планировали. */
export function planningDue(planningDay: number, lastPlannedWeek: string, today = todayISO()): boolean {
  const wd = weekdayIndex(today);
  const inWindow = wd === planningDay || wd === (planningDay + 1) % 7;
  return inWindow && lastPlannedWeek < planningTargetWeek(planningDay, today);
}
