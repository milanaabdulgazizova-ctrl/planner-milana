import { addDays, fromISODate, startOfWeek } from './dates';

/** Правило повтора задачи. Дни недели: 0 = понедельник … 6 = воскресенье. */
export type RepeatRule =
  | { type: 'daily'; until?: string | null }
  | { type: 'weekly'; days: number[]; interval: number; until?: string | null }
  | { type: 'monthly'; day: number | 'lastWorkday'; until?: string | null };

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** День недели даты: 0 = пн … 6 = вс. */
export function weekdayIndex(iso: string): number {
  return (fromISODate(iso).getDay() + 6) % 7;
}

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Последний будний день месяца (праздники не учитываем). */
export function lastWorkday(y: number, m: number): number {
  let d = daysInMonth(y, m);
  for (;;) {
    const wd = new Date(y, m, d).getDay();
    if (wd !== 0 && wd !== 6) return d;
    d--;
  }
}

/** Есть ли повтор в эту дату (start — дата начала серии). */
export function occursOn(rule: RepeatRule, start: string, date: string): boolean {
  if (date < start) return false;
  if (rule.until && date > rule.until) return false;
  switch (rule.type) {
    case 'daily':
      return true;
    case 'weekly': {
      if (!rule.days.includes(weekdayIndex(date))) return false;
      const weeks = Math.round((fromISODate(startOfWeek(date)).getTime() - fromISODate(startOfWeek(start)).getTime()) / (7 * 864e5));
      return weeks % Math.max(1, rule.interval) === 0;
    }
    case 'monthly': {
      const d = fromISODate(date);
      const y = d.getFullYear(), m = d.getMonth();
      // если в месяце нет такого числа (например, 31) — в последний день месяца
      const target = rule.day === 'lastWorkday' ? lastWorkday(y, m) : Math.min(rule.day, daysInMonth(y, m));
      return d.getDate() === target;
    }
  }
}

export function describeRepeat(rule: RepeatRule): string {
  switch (rule.type) {
    case 'daily':
      return 'каждый день';
    case 'weekly': {
      const days = [...rule.days].sort().map((i) => WEEKDAYS_SHORT[i].toLowerCase()).join(', ');
      if (rule.interval > 1) return `раз в ${rule.interval} нед.: ${days}`;
      if (rule.days.length === 7) return 'каждый день';
      if (rule.days.length === 5 && [0, 1, 2, 3, 4].every((d) => rule.days.includes(d))) return 'по будням';
      return days;
    }
    case 'monthly':
      return rule.day === 'lastWorkday' ? 'в последний будний день месяца' : `каждый месяц ${rule.day}-го`;
  }
}

/** День накануне — для «остановить повтор начиная с этой даты». */
export const dayBefore = (iso: string) => addDays(iso, -1);

/** Ближайшая дата повтора начиная с from (ищем до 2 лет вперёд). */
export function nextOccurrence(rule: RepeatRule, start: string, from: string): string | null {
  let d = from < start ? start : from;
  for (let i = 0; i < 800; i++) {
    if (occursOn(rule, start, d)) return d;
    if (rule.until && d > rule.until) return null;
    d = addDays(d, 1);
  }
  return null;
}
