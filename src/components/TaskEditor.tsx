import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { categoriesForDates } from '../data/categories';
import { db, type Task } from '../data/db';
import { useSpheres } from '../data/spheres';
import { deleteOne, stopSeriesFrom, updateOne, updateSeries, updateTask, type TaskPatch } from '../data/tasks';
import { todayISO } from '../lib/dates';
import { nextOccurrence, type RepeatRule } from '../lib/repeat';
import { formatDayMonth } from '../lib/dates';
import { closeTaskEditor, useOpenTask } from './editorStore';
import { RepeatPicker } from './RepeatPicker';

type Draft = Pick<Task, 'title' | 'date' | 'start' | 'end' | 'sphereId' | 'categoryId' | 'note' | 'done'> & { repeat: RepeatRule | null };

const FIELD_KEYS = ['title', 'start', 'end', 'sphereId', 'note'] as const;
const PLACE_KEYS = ['date', 'categoryId', 'done'] as const;

export function TaskEditor() {
  const open = useOpenTask();
  // настоящую задачу берём из базы (вдруг она изменилась), копию «на лету» — как есть
  const fresh = useLiveQuery(() => (open && !open.virtual ? db.tasks.get(open.id) : undefined), [open?.id]);
  const master = useLiveQuery(() => (open?.seriesId ? db.tasks.get(open.seriesId) : undefined), [open?.seriesId]);
  if (!open) return null;
  const task = open.virtual ? open : fresh;
  if (!task || task.deleted) return null;
  if (task.seriesId && master === undefined) return null; // ждём шаблон серии
  return <EditorSheet key={task.id} task={task} seriesRepeat={(master && !master.deleted ? master.repeat : null) ?? null} />;
}

function EditorSheet({ task, seriesRepeat }: { task: Task; seriesRepeat: RepeatRule | null }) {
  const spheres = useSpheres();
  const isSeries = !!task.seriesId;
  const origRepeat = isSeries ? seriesRepeat : (task.repeat ?? null);
  const [d, setD] = useState<Draft>({
    title: task.title,
    date: task.date,
    start: task.start ?? null,
    end: task.end ?? null,
    sphereId: task.sphereId ?? null,
    categoryId: task.categoryId ?? null,
    note: task.note ?? '',
    done: task.done,
    repeat: origRepeat,
  });
  const [ask, setAsk] = useState<null | 'scope' | 'delete'>(null);
  const categories = useLiveQuery(() => (d.date ? categoriesForDates([d.date]) : Promise.resolve([])), [d.date]) ?? [];
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  // что изменилось
  const clean: Draft = { ...d, title: d.title.trim() || task.title, end: d.start ? d.end : null };
  if (clean.date !== task.date && !categories.some((c) => c.id === clean.categoryId)) clean.categoryId = null;
  const diff = (k: keyof Draft) => (clean[k] ?? null) !== ((task as unknown as Draft)[k] ?? null);
  const fieldPatch: TaskPatch = Object.fromEntries(FIELD_KEYS.filter(diff).map((k) => [k, clean[k]]));
  const placePatch: TaskPatch = Object.fromEntries(PLACE_KEYS.filter(diff).map((k) => [k, clean[k]]));
  const hasFields = Object.keys(fieldPatch).length > 0;
  const hasPlace = Object.keys(placePatch).length > 0;
  const repeatChanged = JSON.stringify(clean.repeat) !== JSON.stringify(origRepeat);

  const commit = async (scope?: 'one' | 'all') => {
    if (!isSeries) {
      if (clean.repeat) {
        // обычная задача становится повторяющейся
        await updateTask(task.id, { ...fieldPatch, date: clean.date ?? todayISO(), repeat: clean.repeat, done: false, categoryId: null });
      } else if (hasFields || hasPlace) {
        await updateTask(task.id, { ...fieldPatch, ...placePatch });
      }
      return closeTaskEditor();
    }
    if (repeatChanged && !clean.repeat) {
      // «без повтора»: эта копия остаётся обычной задачей, следующие убираем
      await stopSeriesFrom(task, true);
      if (hasFields || hasPlace) await updateOne(task, { ...fieldPatch, ...placePatch });
      return closeTaskEditor();
    }
    if (hasFields && !scope) return setAsk('scope');
    if (repeatChanged && clean.repeat) await updateSeries(task.seriesId!, task.occurrenceDate!, { repeat: clean.repeat });
    if (scope === 'all') {
      await updateSeries(task.seriesId!, task.occurrenceDate!, fieldPatch);
      if (hasPlace) await updateOne(task, placePatch);
    } else if (hasFields || hasPlace) {
      await updateOne(task, { ...fieldPatch, ...placePatch });
    }
    closeTaskEditor();
  };

  const save = () => void commit();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (ask ? setAsk(null) : save());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="sheet-backdrop" onClick={() => (ask ? setAsk(null) : save())}>
      <div className="sheet" role="dialog" aria-label="Задача" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <textarea className="sheet-title" rows={1} value={d.title} onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })} aria-label="Название" />

        <div className="field">
          <span className="field-label">Дата</span>
          <div className="field-row">
            <input type="date" value={d.date ?? ''} onChange={(e) => set({ date: e.target.value || (d.repeat || isSeries ? d.date : null) })} aria-label="Дата" />
            {!isSeries && !d.repeat && (
              <button className={'chip' + (!d.date ? ' on' : '')} onClick={() => set({ date: d.date ? null : todayISO() })}>
                Когда-нибудь
              </button>
            )}
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
          <span className="field-label">Повтор</span>
          <RepeatPicker value={d.repeat} date={d.date} onChange={(r) => set({ repeat: r, date: r && !d.date ? todayISO() : d.date })} />
          {!isSeries && d.repeat && d.date && (() => {
            const next = nextOccurrence(d.repeat, d.date, d.date);
            return next && next !== d.date ? (
              <p className="muted small">В этот день повтора нет — задача перенесётся на ближайший: {formatDayMonth(next)}.</p>
            ) : null;
          })()}
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

        {d.date && categories.length > 0 && !(d.repeat && !isSeries) && (
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
          {ask === 'scope' ? (
            <div className="ask">
              <p>Это повторяющаяся задача. Изменить:</p>
              <div className="ask-buttons">
                <button className="secondary" onClick={() => void commit('one')}>
                  Только этот раз
                </button>
                <button className="primary" onClick={() => void commit('all')}>
                  Все повторы
                </button>
              </div>
            </div>
          ) : ask === 'delete' ? (
            <div className="ask">
              <p>Удалить повторяющуюся задачу:</p>
              <div className="ask-buttons">
                <button className="secondary" onClick={() => void deleteOne(task).then(closeTaskEditor)}>
                  Только этот раз
                </button>
                <button className="secondary danger" onClick={() => void stopSeriesFrom(task).then(closeTaskEditor)}>
                  Этот и все следующие
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                className="secondary danger"
                onClick={() => {
                  if (isSeries) return setAsk('delete');
                  if (confirm(task.repeat ? 'Удалить повторяющуюся задачу со всеми повторами?' : 'Удалить задачу?')) void deleteOne(task).then(closeTaskEditor);
                }}
              >
                Удалить
              </button>
              <button className="primary" onClick={save}>
                Готово
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
