import Dexie, { type Table } from 'dexie';
import type { RepeatRule } from '../lib/repeat';

// Локальная база на устройстве (IndexedDB) — главный источник данных.
// Облако нужно только для синхронизации между устройствами.

/** Служебные поля, которые есть у каждой синхронизируемой записи. */
export interface SyncFields {
  id: string;
  /** Время последнего изменения (мс). По нему решаем, какая версия новее. */
  updatedAt: number;
  /** 1 = удалено (храним, чтобы удаление дошло до других устройств). */
  deleted: 0 | 1;
  /** 1 = изменено здесь и ещё не отправлено в облако. */
  dirty: 0 | 1;
}

export interface Task extends SyncFields {
  title: string;
  /** YYYY-MM-DD или null для «Когда-нибудь». */
  date: string | null;
  done: boolean;
  /** Порядок внутри списка (для задач без времени). */
  order: number;
  createdAt: number;
  /** Время начала/конца «HH:MM», необязательно. */
  start?: string | null;
  end?: string | null;
  /** Сфера жизни (цветная метка). */
  sphereId?: string | null;
  /** Категория внутри дня. */
  categoryId?: string | null;
  note?: string;
  /** Правило повтора. Задача с повтором — «шаблон серии», сама на экране не показывается. */
  repeat?: RepeatRule | null;
  /** Для копии повторяющейся задачи: id шаблона и исходная дата этой копии. */
  seriesId?: string | null;
  occurrenceDate?: string | null;
  /** Копия «пропущена» (удалена только в этот раз). */
  skipped?: boolean;
  /** Только в памяти: копия, которой ещё нет в базе (появится при первом изменении). */
  virtual?: boolean;
}

/** Привычка. Дни недели: 0 = пн … 6 = вс. */
export interface Habit extends SyncFields {
  name: string;
  days: number[];
  order: number;
  /** С какой даты считать статистику. */
  startDate: string;
}

/** Отметка привычки за день. id = uuidFrom('habit:' + habitId + ':' + date). */
export interface HabitCheck extends SyncFields {
  habitId: string;
  date: string;
  done: boolean;
}

/** Сфера жизни: работа, учёба… — цветная метка задачи. */
export interface Sphere extends SyncFields {
  name: string;
  color: string;
  order: number;
}

/** Категория внутри конкретного дня (у каждого дня свой набор). */
export interface DayCategory extends SyncFields {
  date: string;
  name: string;
  order: number;
}

/** Заметка дня. id = uuidFrom('day-note:' + date). */
export interface DayNote extends SyncFields {
  date: string;
  text: string;
}

/** Фокус недели. id = uuidFrom('week-focus:' + weekStart). */
export interface WeekFocus extends SyncFields {
  weekStart: string;
  goals: string[];
}

/** Настройки, общие для всех устройств. Одна запись, id = uuidFrom('settings'). */
export interface Settings extends SyncFields {
  dayStartHour: number;
  dayEndHour: number;
  startScreen: 'week' | 'day';
  /** Цвет фона приложения. */
  bgColor: string;
  /** Время вечернего разбора «HH:MM». */
  reviewTime: string;
  /** День планирования недели: 0 = пн … 6 = вс. */
  planningDay: number;
  /** Дата последнего вечернего разбора и неделя (понедельник), которую последний раз планировали. */
  lastReviewDate: string;
  lastPlannedWeek: string;
}

export interface Meta {
  key: string;
  value: unknown;
}

class PlannerDB extends Dexie {
  tasks!: Table<Task, string>;
  spheres!: Table<Sphere, string>;
  categories!: Table<DayCategory, string>;
  dayNotes!: Table<DayNote, string>;
  weekFocus!: Table<WeekFocus, string>;
  settings!: Table<Settings, string>;
  habits!: Table<Habit, string>;
  habitChecks!: Table<HabitCheck, string>;
  meta!: Table<Meta, string>;

  constructor() {
    super('planner');
    this.version(1).stores({
      tasks: 'id, date, dirty',
      meta: 'key',
    });
    this.version(2).stores({
      tasks: 'id, date, dirty',
      spheres: 'id, dirty',
      categories: 'id, date, dirty',
      dayNotes: 'id, date, dirty',
      weekFocus: 'id, weekStart, dirty',
      settings: 'id, dirty',
      meta: 'key',
    });
    this.version(3).stores({
      tasks: 'id, date, dirty, occurrenceDate, seriesId',
      spheres: 'id, dirty',
      categories: 'id, date, dirty',
      dayNotes: 'id, date, dirty',
      weekFocus: 'id, weekStart, dirty',
      settings: 'id, dirty',
      habits: 'id, dirty',
      habitChecks: 'id, date, habitId, dirty',
      meta: 'key',
    });
  }
}

export const db = new PlannerDB();

/**
 * Какие таблицы синхронизируются и под каким именем (kind) они лежат в облаке.
 * Новая таблица = новая строка здесь; базу в облаке менять не нужно.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SYNCED: Record<string, Table<any, string>> = {
  task: db.tasks,
  sphere: db.spheres,
  category: db.categories,
  dayNote: db.dayNotes,
  weekFocus: db.weekFocus,
  settings: db.settings,
  habit: db.habits,
  habitCheck: db.habitChecks,
};

/** Меняется при добавлении новых видов записей — тогда скачиваем всё из облака заново. */
export const SYNCED_KINDS_SIGNATURE = Object.keys(SYNCED).sort().join(',');

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
