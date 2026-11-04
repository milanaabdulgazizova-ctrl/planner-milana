import { db, type Task } from './db';
import { alive, patchRecord, putRecord, removeRecord, stamp } from './records';

export { stamp };

/** Разобрать быстрый ввод: «10:00 Созвон» или «10:00-11:30 Созвон» → время + название. */
export function parseQuickTitle(input: string): { title: string; start: string | null; end: string | null } {
  const m = input.trim().match(/^(\d{1,2})[:.](\d{2})(?:\s*[-–—]\s*(\d{1,2})[:.](\d{2}))?\s+(.+)$/);
  if (!m) return { title: input.trim(), start: null, end: null };
  const hm = (h: string, mm: string) => (Number(h) < 24 && Number(mm) < 60 ? `${h.padStart(2, '0')}:${mm}` : null);
  const start = hm(m[1], m[2]);
  if (!start) return { title: input.trim(), start: null, end: null };
  const end = m[3] ? hm(m[3], m[4]) : null;
  return { title: m[5].trim(), start, end };
}

export async function addTask(input: string, date: string | null, categoryId: string | null = null): Promise<void> {
  const { title, start, end } = parseQuickTitle(input);
  if (!title) return;
  const now = stamp();
  await putRecord(db.tasks, crypto.randomUUID(), {
    title,
    date,
    done: false,
    order: now,
    createdAt: now,
    start,
    end,
    sphereId: null,
    categoryId,
    note: '',
  });
}

export async function updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'updatedAt' | 'dirty'>>) {
  await patchRecord(db.tasks, id, patch);
}

export async function deleteTask(id: string) {
  await removeRecord(db.tasks, id);
}

/** Сравнение для показа: сначала без времени (по порядку), потом со временем (по времени). */
export function compareTasks(a: Task, b: Task): number {
  if (!a.start !== !b.start) return a.start ? 1 : -1;
  if (a.start && b.start && a.start !== b.start) return a.start < b.start ? -1 : 1;
  return a.order - b.order;
}

/**
 * Переместить задачу (перетаскиванием): в другой день / категорию / «Когда-нибудь».
 * beforeId — задача, перед которой поставить; без него — в конец списка.
 */
export async function moveTask(id: string, date: string | null, categoryId: string | null, beforeId?: string) {
  const task = await db.tasks.get(id);
  if (!task) return;
  let order = stamp();
  if (beforeId && beforeId !== id) {
    const group = alive(await groupTasks(date, categoryId))
      .filter((t) => t.id !== id && !t.start)
      .sort((a, b) => a.order - b.order);
    const i = group.findIndex((t) => t.id === beforeId);
    if (i >= 0) {
      const next = group[i].order;
      const prev = i > 0 ? group[i - 1].order : next - 1000;
      order = (prev + next) / 2;
    }
  }
  await patchRecord(db.tasks, id, { date, categoryId, order });
}

async function groupTasks(date: string | null, categoryId: string | null): Promise<Task[]> {
  const list = date ? await db.tasks.where('date').equals(date).toArray() : await db.tasks.filter((t) => !t.date).toArray();
  return list.filter((t) => (t.categoryId ?? null) === categoryId);
}

export async function tasksForDates(dates: string[]): Promise<Task[]> {
  return alive(await db.tasks.where('date').anyOf(dates).toArray()).sort(compareTasks);
}

export async function somedayTasks(): Promise<Task[]> {
  return alive(await db.tasks.filter((t) => !t.date).toArray()).sort(compareTasks);
}
