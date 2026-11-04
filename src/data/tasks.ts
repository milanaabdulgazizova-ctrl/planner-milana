import { uuidFrom } from '../lib/uuid';
import { dayBefore, occursOn, type RepeatRule } from '../lib/repeat';
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

export type TaskPatch = Partial<Omit<Task, 'id' | 'updatedAt' | 'dirty' | 'virtual'>>;

export async function updateTask(id: string, patch: TaskPatch) {
  await patchRecord(db.tasks, id, patch);
}

/** Сравнение для показа: сначала без времени (по порядку), потом со временем (по времени). */
export function compareTasks(a: Task, b: Task): number {
  if (!a.start !== !b.start) return a.start ? 1 : -1;
  if (a.start && b.start && a.start !== b.start) return a.start < b.start ? -1 : 1;
  return a.order - b.order;
}

// ---------- повторяющиеся задачи ----------

const occurrenceId = (seriesId: string, date: string) => uuidFrom(`occ:${seriesId}:${date}`);

/** Копия повтора «на лету» — её ещё нет в базе. */
function virtualOccurrence(master: Task, date: string): Task {
  return {
    ...master,
    id: `v:${master.id}:${date}`,
    date,
    done: false,
    categoryId: null,
    repeat: null,
    seriesId: master.id,
    occurrenceDate: date,
    virtual: true,
    dirty: 0,
  };
}

/**
 * Превратить копию «на лету» в настоящую запись (когда её отметили, перенесли или изменили).
 * id постоянный — два устройства не создадут дубликатов.
 */
export async function materialize(task: Task): Promise<string> {
  if (!task.virtual) return task.id;
  const id = occurrenceId(task.seriesId!, task.occurrenceDate!);
  const existing = await db.tasks.get(id);
  if (existing && !existing.deleted) return id;
  await putRecord(db.tasks, id, {
    title: task.title,
    date: task.date,
    done: false,
    order: task.order,
    createdAt: stamp(),
    start: task.start ?? null,
    end: task.end ?? null,
    sphereId: task.sphereId ?? null,
    categoryId: null,
    note: task.note ?? '',
    repeat: null,
    seriesId: task.seriesId,
    occurrenceDate: task.occurrenceDate,
    skipped: false,
  });
  return id;
}

export async function setDone(task: Task, done: boolean) {
  const id = await materialize(task);
  await updateTask(id, { done });
}

/** Изменить только эту задачу (для копии повтора — только этот раз). */
export async function updateOne(task: Task, patch: TaskPatch) {
  const id = await materialize(task);
  await updateTask(id, patch);
}

/** Изменить всю серию: шаблон и ещё не выполненные копии начиная с этой даты. */
export async function updateSeries(seriesId: string, fromDate: string, patch: Pick<TaskPatch, 'title' | 'start' | 'end' | 'sphereId' | 'note' | 'repeat'>) {
  await updateTask(seriesId, patch);
  const { repeat: _r, ...fields } = patch;
  void _r;
  if (!Object.keys(fields).length) return;
  const copies = alive(await db.tasks.where('seriesId').equals(seriesId).toArray()).filter((t) => !t.done && (t.occurrenceDate ?? '') >= fromDate);
  for (const c of copies) await updateTask(c.id, fields);
}

/** Удалить задачу. Для копии повтора — только этот раз. */
export async function deleteOne(task: Task) {
  if (task.seriesId) {
    const id = await materialize(task);
    await updateTask(id, { skipped: true });
  } else {
    await removeRecord(db.tasks, task.id);
  }
}

/**
 * Остановить повтор начиная с этой копии (её и все следующие убрать).
 * keepThis — оставить эту копию обычной задачей (когда в окне задачи выбрали «без повтора»).
 */
export async function stopSeriesFrom(task: Task, keepThis = false) {
  const seriesId = task.seriesId!;
  const occ = task.occurrenceDate!;
  const master = await db.tasks.get(seriesId);
  let keepId: string | null = null;
  if (keepThis) {
    keepId = await materialize(task);
    await updateTask(keepId, { seriesId: null, occurrenceDate: null });
  }
  const copies = alive(await db.tasks.where('seriesId').equals(seriesId).toArray());
  for (const c of copies) if ((c.occurrenceDate ?? '') >= occ && c.id !== keepId) await removeRecord(db.tasks, c.id);
  if (!master || master.deleted) return;
  if (occ <= (master.date ?? occ)) await removeRecord(db.tasks, seriesId);
  else await updateTask(seriesId, { repeat: { ...(master.repeat as RepeatRule), until: dayBefore(occ) } });
}

/**
 * Переместить задачу (перетаскиванием): в другой день / категорию / «Когда-нибудь».
 * beforeId — задача, перед которой поставить; без него — в конец списка.
 */
export async function moveTask(task: Task, date: string | null, categoryId: string | null, beforeId?: string) {
  if (task.seriesId && !date) return; // копию повтора нельзя убрать в «Когда-нибудь»
  let order = stamp();
  if (beforeId && beforeId !== task.id) {
    const list = date ? await tasksForDates([date]) : await somedayTasks();
    const group = list.filter((t) => t.id !== task.id && !t.start && (t.categoryId ?? null) === categoryId).sort((a, b) => a.order - b.order);
    const i = group.findIndex((t) => t.id === beforeId);
    if (i >= 0) {
      const next = group[i].order;
      const prev = i > 0 ? group[i - 1].order : next - 1000;
      order = (prev + next) / 2;
    }
  }
  const id = await materialize(task);
  await updateTask(id, { date, categoryId, order });
}

/** Задачи на эти даты: обычные + копии повторов. */
export async function tasksForDates(dates: string[]): Promise<Task[]> {
  const [onDates, masters, copies] = await Promise.all([
    db.tasks.where('date').anyOf(dates).toArray(),
    db.tasks.filter((t) => !!t.repeat && !t.deleted).toArray(),
    db.tasks.where('occurrenceDate').anyOf(dates).toArray(),
  ]);
  const result = alive(onDates).filter((t) => !t.repeat && !t.skipped);
  // копия уже есть в базе (даже если её перенесли или удалили «только этот раз») — «на лету» не показываем
  const taken = new Set(copies.map((c) => `${c.seriesId}|${c.occurrenceDate}`));
  for (const m of masters) {
    for (const d of dates) {
      if (m.date && occursOn(m.repeat!, m.date, d) && !taken.has(`${m.id}|${d}`)) result.push(virtualOccurrence(m, d));
    }
  }
  return result.sort(compareTasks);
}

export async function somedayTasks(): Promise<Task[]> {
  return alive(await db.tasks.filter((t) => !t.date && !t.repeat).toArray()).sort(compareTasks);
}
