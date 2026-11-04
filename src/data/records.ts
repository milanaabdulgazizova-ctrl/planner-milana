import type { Table } from 'dexie';
import type { SyncFields } from './db';
import { requestSync } from './sync';

let lastStamp = 0;
/** Время изменения; строго растёт, даже если две правки в одну миллисекунду. */
export function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

type Data<T> = Omit<T, keyof SyncFields>;

/** Создать или полностью перезаписать запись (и отправить в облако). */
export async function putRecord<T extends SyncFields>(table: Table<T, string>, id: string, data: Data<T>) {
  await table.put({ ...data, id, updatedAt: stamp(), deleted: 0, dirty: 1 } as T);
  requestSync();
}

/** Изменить часть полей записи. */
export async function patchRecord<T extends SyncFields>(table: Table<T, string>, id: string, patch: Partial<Data<T>> & { deleted?: 0 | 1 }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await table.update(id, { ...patch, updatedAt: stamp(), dirty: 1 } as any);
  requestSync();
}

/** «Мягко» удалить запись: она исчезнет на всех устройствах. */
export async function removeRecord<T extends SyncFields>(table: Table<T, string>, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await table.update(id, { deleted: 1, updatedAt: stamp(), dirty: 1 } as any);
  requestSync();
}

export const alive = <T extends SyncFields>(list: T[]) => list.filter((x) => !x.deleted);
