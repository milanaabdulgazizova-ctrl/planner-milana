import { useLiveQuery } from 'dexie-react-hooks';
import { todayISO } from '../lib/dates';
import { weekdayIndex } from '../lib/repeat';
import { uuidFrom } from '../lib/uuid';
import { db, type Habit } from './db';
import { alive, patchRecord, putRecord, removeRecord, stamp } from './records';

export function useHabits(): Habit[] {
  return useLiveQuery(async () => alive(await db.habits.toArray()).sort((a, b) => a.order - b.order), []) ?? [];
}

export async function addHabit(name: string, days: number[]) {
  if (!name.trim() || !days.length) return;
  await putRecord(db.habits, crypto.randomUUID(), { name: name.trim(), days: [...days].sort(), order: stamp(), startDate: todayISO() });
}

export const updateHabit = (id: string, patch: Partial<Pick<Habit, 'name' | 'days' | 'order'>>) => patchRecord(db.habits, id, patch);
export const deleteHabit = (id: string) => removeRecord(db.habits, id);

/** Привычки, которые запланированы на эту дату. */
export function habitsForDate(habits: Habit[], date: string): Habit[] {
  const wd = weekdayIndex(date);
  return habits.filter((h) => h.days.includes(wd) && date >= h.startDate);
}

const checkId = (habitId: string, date: string) => uuidFrom(`habit:${habitId}:${date}`);

export async function setHabitDone(habitId: string, date: string, done: boolean) {
  await putRecord(db.habitChecks, checkId(habitId, date), { habitId, date, done });
}

/** Отметки за даты: множество «habitId|date» выполненных. */
export function useHabitChecks(dates: string[]): Set<string> {
  return (
    useLiveQuery(async () => {
      const list = alive(await db.habitChecks.where('date').anyOf(dates).toArray());
      return new Set(list.filter((c) => c.done).map((c) => `${c.habitId}|${c.date}`));
    }, [dates.join(',')]) ?? new Set<string>()
  );
}
