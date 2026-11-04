import { db } from './db';
import { alive, patchRecord, putRecord, removeRecord, stamp } from './records';

export async function addCategory(date: string, name: string): Promise<void> {
  if (!name.trim()) return;
  await putRecord(db.categories, crypto.randomUUID(), { date, name: name.trim(), order: stamp() });
}

export const renameCategory = (id: string, name: string) => patchRecord(db.categories, id, { name: name.trim() });

/** Удалить категорию: её задачи не удаляются, а переходят в «без категории». */
export async function deleteCategory(id: string) {
  const tasks = alive(await db.tasks.filter((t) => t.categoryId === id).toArray());
  for (const t of tasks) await patchRecord(db.tasks, t.id, { categoryId: null });
  await removeRecord(db.categories, id);
}

export async function categoriesForDates(dates: string[]) {
  return alive(await db.categories.where('date').anyOf(dates).toArray()).sort((a, b) => a.order - b.order);
}
