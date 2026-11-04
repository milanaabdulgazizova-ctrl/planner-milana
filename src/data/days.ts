import { useLiveQuery } from 'dexie-react-hooks';
import { uuidFrom } from '../lib/uuid';
import { db, type Settings } from './db';
import { alive, putRecord } from './records';

// ---------- заметка дня ----------

export const dayNoteId = (date: string) => uuidFrom('day-note:' + date);

export async function notesForDates(dates: string[]) {
  return alive(await db.dayNotes.where('date').anyOf(dates).toArray());
}

export async function setDayNote(date: string, text: string) {
  await putRecord(db.dayNotes, dayNoteId(date), { date, text });
}

// ---------- фокус недели ----------

export const weekFocusId = (weekStart: string) => uuidFrom('week-focus:' + weekStart);

export function useWeekFocus(weekStart: string): string[] {
  return useLiveQuery(async () => {
    const r = await db.weekFocus.get(weekFocusId(weekStart));
    return r && !r.deleted ? r.goals : [];
  }, [weekStart]) ?? [];
}

export async function setWeekGoals(weekStart: string, goals: string[]) {
  await putRecord(db.weekFocus, weekFocusId(weekStart), { weekStart, goals });
}

// ---------- настройки ----------

export const SETTINGS_ID = uuidFrom('settings');
export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updatedAt' | 'deleted' | 'dirty'> = {
  dayStartHour: 7,
  dayEndHour: 23,
  startScreen: 'week',
};

export function useSettings() {
  return (
    useLiveQuery(async () => {
      const r = await db.settings.get(SETTINGS_ID);
      return { ...DEFAULT_SETTINGS, ...(r && !r.deleted ? r : {}) };
    }, []) ?? DEFAULT_SETTINGS
  );
}

export async function updateSettings(patch: Partial<typeof DEFAULT_SETTINGS>) {
  const r = await db.settings.get(SETTINGS_ID);
  const cur = { ...DEFAULT_SETTINGS, ...(r ?? {}) };
  const next = { dayStartHour: cur.dayStartHour, dayEndHour: cur.dayEndHour, startScreen: cur.startScreen, ...patch };
  if (patch.startScreen) localStorage.setItem('planner.startScreen', patch.startScreen);
  await putRecord(db.settings, SETTINGS_ID, next);
}
