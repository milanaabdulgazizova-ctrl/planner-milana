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
  accentColor: '#6F8FA8',
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

// ---------- тема: фон и акцент ----------

export const THEMES: { name: string; bg: string; accent: string }[] = [
  { name: 'Шалфей', bg: '#EDF1EA', accent: '#6F8FA8' },
  { name: 'Лаванда', bg: '#ECEAF3', accent: '#8B7FB5' },
  { name: 'Пудра', bg: '#F3E9E7', accent: '#B4868A' },
  { name: 'Мята', bg: '#E6F0EC', accent: '#5E9886' },
  { name: 'Песок', bg: '#F2EDE2', accent: '#A88654' },
  { name: 'Небо', bg: '#E8EFF3', accent: '#5F8DB5' },
  { name: 'Молоко', bg: '#F4F1EA', accent: '#7D8C6E' },
  { name: 'Персик', bg: '#F5ECE4', accent: '#C08A6B' },
];

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

export const ACCENT_COLORS: [string, string][] = [
  ['#6F8FA8', 'Пыльно-голубой'],
  ['#8B7FB5', 'Лавандовый'],
  ['#B4868A', 'Пыльная роза'],
  ['#5E9886', 'Мятный'],
  ['#A88654', 'Карамель'],
  ['#5F8DB5', 'Небесный'],
  ['#7D8C6E', 'Оливковый'],
  ['#C08A6B', 'Терракота'],
];

const isHex = (c: string) => /^#[0-9a-f]{6}$/i.test(c);

/** Применить тему (и запомнить локально, чтобы при запуске не мигали старые цвета). */
export function applyTheme(bg: string, accent: string) {
  const root = document.documentElement.style;
  if (isHex(bg)) {
    root.setProperty('--bg', bg);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }
  if (isHex(accent)) root.setProperty('--accent', accent);
  try {
    localStorage.setItem('planner.theme', JSON.stringify({ bg, accent }));
  } catch {
    /* не страшно */
  }
}

/** Тема, сохранённая на этом устройстве в прошлый раз. */
export function savedTheme(): { bg: string; accent: string } {
  try {
    const t = JSON.parse(localStorage.getItem('planner.theme') ?? 'null');
    if (t?.bg) return t;
  } catch {
    /* ignore */
  }
  return { bg: localStorage.getItem('planner.bg') ?? DEFAULT_SETTINGS.bgColor, accent: DEFAULT_SETTINGS.accentColor };
}
