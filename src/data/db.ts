import Dexie, { type Table } from 'dexie';

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
  order: number;
  createdAt: number;
}

export interface Meta {
  key: string;
  value: unknown;
}

class PlannerDB extends Dexie {
  tasks!: Table<Task, string>;
  meta!: Table<Meta, string>;

  constructor() {
    super('planner');
    this.version(1).stores({
      tasks: 'id, date, dirty',
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
};

/** Меняется при добавлении новых видов записей — тогда скачиваем всё из облака заново. */
export const SYNCED_KINDS_SIGNATURE = Object.keys(SYNCED).sort().join(',');

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
