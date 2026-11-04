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
  bgColor: '#EDF1EA',
  reviewTime: '21:00',
  planningDay: 6,
  lastReviewDate: '',
  lastPlannedWeek: '',
};

export function useSettings() {
  return (
    useLiveQuery(async () => {
      const r = await db.settings.get(SETTINGS_ID);
      return { ...DEFAULT_SETTINGS, ...(r && !r.deleted ? r : {}) };
    }, []) ?? DEFAULT_SETTINGS
  );
}

/** Только поля настроек (без служебных полей синхронизации). */
function pickSettings(x: Record<string, unknown>): typeof DEFAULT_SETTINGS {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) out[k] = x[k] ?? (DEFAULT_SETTINGS as Record<string, unknown>)[k];
  return out as typeof DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<typeof DEFAULT_SETTINGS>) {
  const r = await db.settings.get(SETTINGS_ID);
  const cur = { ...DEFAULT_SETTINGS, ...(r ?? {}) };
  const next = { ...pickSettings(cur), ...patch };
  if (patch.startScreen) localStorage.setItem('planner.startScreen', patch.startScreen);
  await putRecord(db.settings, SETTINGS_ID, next);
}

// ---------- цвет фона ----------

export const BG_COLORS: [string, string][] = [
  ['#EDF1EA', 'Шалфей'],
  ['#F4F1EA', 'Молочный'],
  ['#F3E9E7', 'Пудровый'],
  ['#ECEAF3', 'Лавандовый'],
  ['#E8EFF3', 'Голубой'],
  ['#F2EDE2', 'Песочный'],
  ['#E6F0EC', 'Мятный'],
  ['#EEEEEC', 'Светло-серый'],
];

/** Применить цвет фона (и запомнить локально, чтобы при запуске не мигал старый цвет). */
export function applyBgColor(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return;
  document.documentElement.style.setProperty('--bg', color);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  try {
    localStorage.setItem('planner.bg', color);
  } catch {
    /* не страшно */
  }
}
