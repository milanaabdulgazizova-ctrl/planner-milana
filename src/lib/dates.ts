// Даты храним строкой YYYY-MM-DD в местном времени. Неделя начинается с понедельника.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function startOfWeek(iso: string): string {
  const d = fromISODate(iso);
  const shift = (d.getDay() + 6) % 7; // пн = 0
  d.setDate(d.getDate() - shift);
  return toISODate(d);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const weekdayLong = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });
const weekdayShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

export const formatWeekday = (iso: string) => weekdayLong.format(fromISODate(iso));
export const formatWeekdayShort = (iso: string) => weekdayShort.format(fromISODate(iso));
export const formatDayMonth = (iso: string) => dayMonth.format(fromISODate(iso));

export function formatWeekRange(weekStart: string): string {
  const a = fromISODate(weekStart);
  const b = fromISODate(addDays(weekStart, 6));
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${dayMonth.format(b)}`;
  }
  return `${dayMonth.format(a)} – ${dayMonth.format(b)}`;
}
