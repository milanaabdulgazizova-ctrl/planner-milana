import { db, type Task } from './db';
import { requestSync } from './sync';

let lastStamp = 0;
/** Время изменения; строго растёт, даже если две правки в одну миллисекунду. */
export function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

export async function addTask(title: string, date: string | null): Promise<void> {
  const t = title.trim();
  if (!t) return;
  const now = stamp();
  await db.tasks.add({
    id: crypto.randomUUID(),
    title: t,
    date,
    done: false,
    order: now,
    createdAt: now,
    updatedAt: now,
    deleted: 0,
    dirty: 1,
  });
  requestSync();
}

export async function updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'updatedAt' | 'dirty'>>) {
  await db.tasks.update(id, { ...patch, updatedAt: stamp(), dirty: 1 });
  requestSync();
}

export async function deleteTask(id: string) {
  await updateTask(id, { deleted: 1 });
}

function sortTasks(list: Task[]) {
  return list.sort((a, b) => a.order - b.order);
}

export async function tasksForDate(date: string): Promise<Task[]> {
  return sortTasks((await db.tasks.where('date').equals(date).toArray()).filter((t) => !t.deleted));
}

export async function tasksForDates(dates: string[]): Promise<Task[]> {
  return sortTasks((await db.tasks.where('date').anyOf(dates).toArray()).filter((t) => !t.deleted));
}

export async function somedayTasks(): Promise<Task[]> {
  return sortTasks(await db.tasks.filter((t) => !t.date && !t.deleted).toArray());
}
