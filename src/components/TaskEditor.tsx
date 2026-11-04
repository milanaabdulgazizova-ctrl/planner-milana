import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { categoriesForDates } from '../data/categories';
import { db, type Task } from '../data/db';
import { useSpheres } from '../data/spheres';
import { deleteTask, updateTask } from '../data/tasks';
import { todayISO } from '../lib/dates';
import { closeTaskEditor, useOpenTaskId } from './editorStore';

type Draft = Pick<Task, 'title' | 'date' | 'start' | 'end' | 'sphereId' | 'categoryId' | 'note' | 'done'>;

export function TaskEditor() {
  const id = useOpenTaskId();
  const task = useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id]);
  if (!id || !task || task.deleted) return null;
  return <EditorSheet key={task.id} task={task} />;
}

function EditorSheet({ task }: { task: Task }) {
  const spheres = useSpheres();
  const [d, setD] = useState<Draft>({
    title: task.title,
    date: task.date,
    start: task.start ?? null,
    end: task.end ?? null,
    sphereId: task.sphereId ?? null,
    categoryId: task.categoryId ?? null,
    note: task.note ?? '',
    done: task.done,
  });
  const categories = useLiveQuery(() => (d.date ? categoriesForDates([d.date]) : Promise.resolve([])), [d.date]) ?? [];
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  const save = () => {
    const patch: Partial<Draft> = { ...d, title: d.title.trim() || task.title };
    if (patch.date !== task.date && !categories.some((c) => c.id === patch.categoryId)) patch.categoryId = null;
    if (!patch.start) patch.end = null;
    const changed = (Object.keys(patch) as (keyof Draft)[]).some((k) => (patch[k] ?? null) !== (task[k] ?? null));
    if (changed) void updateTask(task.id, patch);
    closeTaskEditor();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && save();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="sheet-backdrop" onClick={save}>
      <div className="sheet" role="dialog" aria-label="Задача" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <textarea className="sheet-title" rows={1} value={d.title} onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })} aria-label="Название" />

        <div className="field">
          <span className="field-label">Дата</span>
          <div className="field-row">
            <input type="date" value={d.date ?? ''} onChange={(e) => set({ date: e.target.value || null })} aria-label="Дата" />
            <button className={'chip' + (!d.date ? ' on' : '')} onClick={() => set({ date: d.date ? null : todayISO() })}>
              Когда-нибудь
            </button>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Время</span>
          <div className="field-row">
            <input type="time" value={d.start ?? ''} onChange={(e) => set({ start: e.target.value || null })} aria-label="Начало" />
            <span className="muted">—</span>
            <input type="time" value={d.end ?? ''} disabled={!d.start} onChange={(e) => set({ end: e.target.value || null })} aria-label="Конец" />
            {d.start && (
              <button className="link" onClick={() => set({ start: null, end: null })}>
                без времени
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Сфера</span>
          <div className="chips">
            <button className={'chip' + (!d.sphereId ? ' on' : '')} onClick={() => set({ sphereId: null })}>
              нет
            </button>
            {spheres.map((s) => (
              <button key={s.id} className={'chip sphere-chip' + (d.sphereId === s.id ? ' on' : '')} style={{ ['--sphere' as string]: s.color }} onClick={() => set({ sphereId: s.id })}>
                <span className="sphere-dot" /> {s.name}
              </button>
            ))}
          </div>
        </div>

        {d.date && categories.length > 0 && (
          <div className="field">
            <span className="field-label">Категория дня</span>
            <div className="chips">
              <button className={'chip' + (!d.categoryId ? ' on' : '')} onClick={() => set({ categoryId: null })}>
                без категории
              </button>
              {categories.map((c) => (
                <button key={c.id} className={'chip' + (d.categoryId === c.id ? ' on' : '')} onClick={() => set({ categoryId: c.id })}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <span className="field-label">Заметка</span>
          <textarea className="sheet-note" rows={3} value={d.note ?? ''} onChange={(e) => set({ note: e.target.value })} placeholder="Подробности, ссылки…" />
        </div>

        <div className="sheet-actions">
          <button
            className="secondary danger"
            onClick={() => {
              if (confirm('Удалить задачу?')) {
                void deleteTask(task.id);
                closeTaskEditor();
              }
            }}
          >
            Удалить
          </button>
          <button className="primary" onClick={save}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
